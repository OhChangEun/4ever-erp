import { http, type PathParams } from 'msw';

interface CustomerPatchBody {
  customerName: string;
  ceoName: string;
  businessNumber: string;
  statusCode: string;
  customerPhone: string;
  customerEmail: string;
  baseAddress: string;
  detailAddress: string;
  manager: Partial<{ name: string; mobile: string; email: string }>;
  note: string;
}
import { SALES_BASE_PATH, SALES_ENDPOINTS } from '@/app/types/api';
import type { Schema } from '@/lib/api/contract';
import { addCreated, mockState } from '../state';
import { MOTOR, catalogItem, type line } from './catalog';
import { stockOf } from './inventory.handlers';
import {
  CUSTOMERS,
  QUOTES,
  addDays,
  monthStart,
  mondayOf,
  orderTotals,
  seedOrders,
  todayKey,
  type Customer,
  type CustomerExtra,
  type Order,
  type Quote,
} from './seed';
import {
  ok,
  okNoData,
  error,
  notFound,
  shouldError,
  isoNow,
  paged,
  newestFirst,
  flow,
  statResponse,
  type Metric,
} from './utils';

type Line = ReturnType<typeof line>;

/**
 * 영업 목이 기억하는 쓰기 결과(로그인별, `src/mocks/state.ts`).
 * 상태 값은 verified=false 다. 견적 목록과 상세는 게이트웨이가 Object 로 넘긴다(SdController.java:95).
 * 견적 REVIEW(검토 요청 뒤), APPROVAL(즉시 납품 뒤): 목록 요청의 파라미터 설명(SdController.java:101)과 enum QuotationStatus.
 *   그 enum 은 참조하는 곳이 없고, 같은 컨트롤러의 승인 API 설명(:392)은 APPROVED 라고 적는다.
 * 새 주문 READY_FOR_SHIPMENT: 승인 API 설명(SdController.java:392).
 * 이미 처리된 견적에 또 보내도 성공으로 답한다(실서버 동작 미확인)
 */
const salesState = mockState<{
  quoteStatus: Map<string, Quote['statusCode']>;
  createdQuotes: Quote[];
  createdOrders: Order[];
  createdCustomers: Customer[];
  customerEdits: Map<string, Partial<CustomerPatchBody>>;
  /** 새 견적과 새 주문의 품목 줄(견적 id, 주문 id → 줄) */
  createdLines: Map<string, Line[]>;
  /** 새 고객의 상세 칸 */
  customerExtras: Map<string, CustomerExtra>;
}>(() => ({
  quoteStatus: new Map(),
  createdQuotes: [],
  createdOrders: [],
  createdCustomers: [],
  customerEdits: new Map(),
  createdLines: new Map(),
  customerExtras: new Map(),
}));

/** 기본 견적(qt-001~016)과 기본 주문의 품목 줄. 줄 금액 합이 목록의 총액이다 */
const seedLines = (rowId: string) =>
  QUOTES.find(({ quote }) => quote.quotationId === rowId)?.lines ??
  seedOrders().find(({ order }) => order.salesOrderId === rowId)?.lines;

/**
 * 목록에서 찾은 견적이나 주문의 줄. 행을 못 찾았으면(모르는 id, 상한으로 밀려난 새 행) 저장된 줄을 쓰지 않고
 * fallback(기본 행)의 줄을 준다. 그 상세는 기본 행의 총액을 쓰므로 줄과 총액이 같은 행에서 나온다(리뷰 A2)
 */
const linesOf = (
  request: Request,
  rowId: string | undefined,
  fallback: 'qt-001' | 'so-001',
): Line[] =>
  (rowId === undefined
    ? undefined
    : (salesState(request).createdLines.get(rowId) ?? seedLines(rowId))) ??
  seedLines(fallback) ??
  [];

const byQuoteDate = newestFirst<Quote>(
  (quote) => quote.quotationDate,
  (quote) => quote.quotationId,
);
const byOrderDate = newestFirst<Order>(
  (order) => order.orderDate,
  (order) => order.salesOrderId,
);

/** 기본 견적과 새로 만든 견적에 바뀐 상태를 덮은 목록. 견적일 최신순(새 견적은 오늘이라 맨 위) */
const quotesOf = (request: Request) => {
  const state = salesState(request);
  return [...QUOTES.map(({ quote }) => quote), ...state.createdQuotes]
    .map((quote) => ({
      ...quote,
      statusCode: state.quoteStatus.get(quote.quotationId) ?? quote.statusCode,
    }))
    .sort(byQuoteDate);
};

/** 기본 주문(주마다 만든 것)과 즉시 납품으로 만든 주문. 주문일 최신순 */
const ordersOf = (request: Request) =>
  [...seedOrders().map(({ order }) => order), ...salesState(request).createdOrders].sort(
    byOrderDate,
  );

/** 기본 고객의 상세 칸(씨앗) */
const seedExtra = (customerId: string) =>
  CUSTOMERS.find(({ customer }) => customer.customerId === customerId)?.extra;

/**
 * 고객 목록. 기본 고객과 새 고객에 수정한 이름, 상태, 담당자를 덮는다.
 * 주문 수, 거래 금액, 마지막 주문일은 그 로그인의 주문 목록에서 원래 이름으로 센다
 */
const customersOf = (request: Request) => {
  const state = salesState(request);
  const orders = ordersOf(request);
  return [...CUSTOMERS.map(({ customer }) => customer), ...state.createdCustomers].map(
    (customer) => {
      const edit = state.customerEdits.get(customer.customerId);
      const own = orders.filter((order) => order.customerName === customer.customerName);
      return {
        ...customer,
        customerName: edit?.customerName ?? customer.customerName,
        statusCode: edit?.statusCode ?? customer.statusCode,
        manager: {
          managerName: edit?.manager?.name ?? customer.manager.managerName,
          managerPhone: edit?.manager?.mobile ?? customer.manager.managerPhone,
          managerEmail: edit?.manager?.email ?? customer.manager.managerEmail,
        },
        orderCount: own.length,
        totalTransactionAmount: own.reduce((sum, order) => sum + order.totalAmount, 0),
        // 최신순이라 첫 주문이 마지막 주문
        lastOrderDate: own[0]?.orderDate ?? '',
      };
    },
  );
};

/** 고객 상세 칸. 새 고객은 등록할 때 적은 값, 기본 고객은 씨앗 */
const extraOf = (request: Request, customerId: string) =>
  salesState(request).customerExtras.get(customerId) ?? seedExtra(customerId);

/**
 * 영업 통계(카드 "데모 데이터 채우기" 결정 5). 신규 주문과 매출은 그 로그인의 주문 목록에서 센다.
 * 주는 이번 주 월요일~오늘(매출 분석의 마지막 점과 같은 창), 월은 이번 달, 분기는 최근 3달, 연은 최근 12달
 * (재무 월별 손익의 분기, 연 규칙과 같다)
 */
const salesStats = (request: Request) => {
  const today = todayKey();
  const orders = ordersOf(request);
  const windows = {
    week: orderTotals(orders, mondayOf(today), today),
    month: orderTotals(orders, monthStart(today), today),
    quarter: orderTotals(orders, monthStart(today, 2), today),
    year: orderTotals(orders, monthStart(today, 11), today),
  };
  const metric = (pick: (totals: { count: number; amount: number }) => number): Metric => ({
    week: pick(windows.week),
    month: pick(windows.month),
    quarter: pick(windows.quarter),
    year: pick(windows.year),
  });
  return statResponse({
    sales_amount: metric((totals) => totals.amount),
    new_orders_count: metric((totals) => totals.count),
  });
};

/** 합 total 을 가중치대로 나눈다. 반올림 나머지는 첫 칸에 몰아 합이 total 과 같다 */
const split = (total: number, weights: number[]) => {
  const all = weights.reduce((sum, weight) => sum + weight, 0);
  const parts = weights.map((weight) => Math.floor((total * weight) / all));
  parts[0] += total - parts.reduce((sum, part) => sum + part, 0);
  return parts;
};

/**
 * 매출 분석(카드 "목 데이터 현실성", "데모 데이터 채우기"). 요청 기간의 주(월요일 시작)마다 한 점이고 값은 그 로그인의
 * 주문 목록에서 그 주와 기간이 겹치는 날의 주문을 센다. 점의 연, 월은 그 주 월요일과 시작일 중 늦은 날의 것이고
 * 주 번호는 그 달 안에서 센다. 제품 비중과 주요 고객은 같은 주문의 품목 줄과 고객을 나눈다.
 * 기간이 없으면 끝은 오늘, 시작은 그 달 1일(verified=false, 서버 기본값 모름)
 */
const salesAnalytics = (request: Request, startDate: string | null, endDate: string | null) => {
  const end = endDate ?? todayKey();
  const start = startDate ?? monthStart(end);
  const orders = ordersOf(request).filter(
    (order) => order.orderDate >= start && order.orderDate <= end,
  );
  // 시작이 끝보다 늦으면 같은 주여도 점이 없다(리뷰 A1. 카드 결정 5)
  const weekInMonth = new Map<string, number>();
  const trend = [];
  const firstMonday = mondayOf(start);
  for (let monday = firstMonday; start <= end && monday <= end; monday = addDays(monday, 7)) {
    const at = monday > start ? monday : start;
    const month = at.slice(0, 7);
    const week = (weekInMonth.get(month) ?? 0) + 1;
    weekInMonth.set(month, week);
    const totals = orderTotals(orders, at, addDays(monday, 6));
    trend.push({
      year: Number(at.slice(0, 4)),
      month: Number(at.slice(5, 7)),
      week,
      sale: totals.amount,
      orderCount: totals.count,
    });
  }
  const totalSale = trend.reduce((sum, point) => sum + point.sale, 0);
  const range = (values: number[]) => ({
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
  });
  const lastMonday = addDays(firstMonday, (trend.length - 1) * 7);
  // 제품별 금액(품목 줄 합)과 고객별 건수, 금액
  const products = new Map<string, { productCode: string; productName: string; sale: number }>();
  const customers = new Map<string, { orderCount: number; sale: number }>();
  for (const order of orders) {
    for (const item of linesOf(request, order.salesOrderId, 'so-001')) {
      const code = catalogItem(item.itemId)?.itemNumber ?? item.itemId;
      const product = products.get(code) ?? {
        productCode: code,
        productName: item.itemName,
        sale: 0,
      };
      products.set(code, { ...product, sale: product.sale + item.amount });
    }
    const customer = customers.get(order.customerName) ?? { orderCount: 0, sale: 0 };
    customers.set(order.customerName, {
      orderCount: customer.orderCount + 1,
      sale: customer.sale + order.totalAmount,
    });
  }
  const productList = [...products.values()].sort((a, b) => b.sale - a.sale);
  const shares =
    totalSale > 0
      ? split(
          100,
          productList.map((product) => product.sale),
        )
      : [];
  return {
    period: {
      start,
      end,
      // 점이 없으면 주 범위도 요청 기간 그대로
      weekStart: trend.length ? firstMonday : start,
      weekEnd: trend.length ? addDays(lastMonday, 6) : end,
      weekCount: trend.length,
    },
    trend,
    trendScale: {
      sale: range(trend.map((point) => point.sale)),
      orderCount: range(trend.map((point) => point.orderCount)),
    },
    // 기간에 매출이 없으면 나눌 것이 없어 비중과 고객도 비운다
    productShare:
      totalSale > 0 ? productList.map((product, i) => ({ ...product, saleShare: shares[i] })) : [],
    topCustomers:
      totalSale > 0
        ? [...customers.entries()]
            .map(([customerName, totals]) => {
              const customer = CUSTOMERS.find((row) => row.customer.customerName === customerName);
              return {
                customerNumber: customer?.customer.customerNumber ?? '',
                customerName,
                orderCount: totals.orderCount,
                sale: totals.sale,
                active: customer?.customer.statusCode !== 'INACTIVE',
              };
            })
            .sort((a, b) => b.sale - a.sale)
        : [],
  };
};

export const salesHandlers = [
  http.get(SALES_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load sales stats', 500);
    // 신규 주문과 매출은 그 로그인의 주문 목록에서 센다. 주 값 = 매출 분석의 이번 주 점(카드 "데모 데이터 채우기")
    return ok(salesStats(request));
  }),
  http.get(SALES_ENDPOINTS.CSUTOMER_STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load customer stats', 500);
    // 주 값은 그 로그인의 견적 목록 행 수
    return ok(statResponse({ quotation_count: flow(quotesOf(request).length) }));
  }),
  http.get(SALES_ENDPOINTS.QUOTES_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load quotes', 500);
    const url = new URL(request.url);
    // 게이트웨이 목록 상태 값은 APPROVAL(SdController.java:101, QuotationListItemDto.java:20).
    // status 가 있으면 같은 상태만 준다. 옛 값 APPROVED 를 받으면 목은 빈 목록이다.
    // 실서버는 QuotationStatus.from 이 예외를 던질 수 있어 어떻게 답하는지 미확인
    const status = url.searchParams.get('status');
    const content = quotesOf(request).filter(
      (quote) => !status || status === 'ALL' || quote.statusCode === status,
    );
    return ok(paged(request, content));
  }),
  http.get<{ quotationId: string }>(
    `${SALES_BASE_PATH}/quotations/:quotationId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load quote detail', 500);
      const { quotationId } = params;
      // 목록의 그 행에서 만든다. 그 로그인의 목록에 없으면 404(카드 "없는 건은 404")
      const quote = quotesOf(request).find((row) => row.quotationId === quotationId);
      if (!quote) return notFound('견적 상세 조회');
      return ok({
        quotationId,
        quotationNumber: quote.quotationNumber,
        quotationDate: quote.quotationDate,
        dueDate: quote.dueDate,
        // 게이트웨이 견적 상태 enum 은 APPROVAL(QuotationStatus.java:13). 목록과 같은 상태(검토 요청이나 즉시 납품의 결과 포함)
        statusCode: quote.statusCode,
        customerName: quote.customerName,
        // 고객 목록의 대표자. 목록에 없는 이름이면 빈칸
        ceoName:
          CUSTOMERS.find(({ customer }) => customer.customerName === quote.customerName)?.extra
            .ceoName ?? '',
        items: linesOf(request, quotationId, 'qt-001').map((item) => ({
          ...item,
          uomName: 'EA',
        })),
        totalAmount: quote.totalAmount,
      });
    },
  ),
  http.post<PathParams, Schema<'NewOrderRequest'>>(
    SALES_ENDPOINTS.NEW_ORDER,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create quote', 500);
      const state = salesState(request);
      const body = await request.json();
      // 고객과 담당자는 게이트웨이가 로그인에서 정한다. 목은 첫 견적의 값을 쓴다
      const lines = body.items.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemId === MOTOR.itemId ? MOTOR.itemName : item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
      }));
      addCreated(
        state.createdQuotes,
        (serial) => {
          state.createdLines.set(`qt-${serial}`, lines);
          return {
            ...QUOTES[0].quote,
            quotationId: `qt-${serial}`,
            quotationNumber: `QT-2026-${serial}`,
            quotationDate: todayKey(),
            totalAmount: lines.reduce((sum, item) => sum + item.amount, 0),
            statusCode: 'PENDING',
          };
        },
        QUOTES.length + 1,
        // 상한으로 밀려난 견적의 줄도 같이 지운다
        (dropped) => state.createdLines.delete(dropped.quotationId),
      );
      return ok({ items: body });
    },
  ),
  http.get(SALES_ENDPOINTS.ORDERS_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load orders', 500);
    const url = new URL(request.url);
    // 게이트웨이와 같은 이름(startDate, endDate)으로만 주문일을 거른다. 모르는 이름은 서버처럼 무시한다
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const content = ordersOf(request).filter(
      (order) =>
        (!startDate || order.orderDate >= startDate) && (!endDate || order.orderDate <= endDate),
    );
    return ok(paged(request, content));
  }),
  http.get(`${SALES_BASE_PATH}/orders/:salesOrderId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load order detail', 500);
    const salesOrderId = String(params.salesOrderId);
    // 목록의 그 행에서 만든다. 그 로그인의 목록에 없으면 404
    const order = ordersOf(request).find((row) => row.salesOrderId === salesOrderId);
    if (!order) return notFound('주문서 상세 조회');
    // 고객 목록에 있는 고객이면 그 정보, 견적에만 나오는 고객(즉시 납품으로 만든 주문)은 이름만 안다
    const customer = customersOf(request).find((row) => row.customerName === order.customerName);
    const extra = customer && extraOf(request, customer.customerId);
    return ok({
      order: {
        salesOrderId,
        salesOrderNumber: order.salesOrderNumber,
        orderDate: order.orderDate,
        dueDate: order.dueDate,
        statusCode: order.statusCode,
        totalAmount: order.totalAmount,
      },
      customer: {
        // 게이트웨이 OrderCustomerDto.java:11 모양. customerId 는 문자열, customerCode 는 없다
        customerId: customer?.customerId ?? '',
        customerName: order.customerName,
        customerBaseAddress: extra?.baseAddress ?? '',
        customerDetailAddress: extra?.detailAddress ?? '',
        manager: customer?.manager ?? { managerName: '', managerPhone: '', managerEmail: '' },
      },
      items: linesOf(request, salesOrderId, 'so-001').map(
        ({ itemId, itemName, quantity, unitPrice, amount }) => ({
          itemId,
          itemName,
          quantity,
          uonName: 'EA',
          unitPrice,
          amount,
        }),
      ),
      note: '우선 납기 요청',
    });
  }),
  http.post<PathParams, { quotationId: string }>(
    SALES_ENDPOINTS.QUOTE_CONFIRM,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to confirm quote', 500);
      salesState(request).quoteStatus.set((await request.json()).quotationId, 'REVIEW');
      return okNoData();
    },
  ),
  http.post<PathParams, { items: Array<Schema<'Inventories'>> }>(
    SALES_ENDPOINTS.INVENTORY_CHECK,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to check inventory', 500);
      // 요청 품목마다 품목표 재고(재고 이동 결과 포함)와 견준다. 품목표에 없는 품목은 재고 0.
      // 부족 상태 값 INSUFFICIENT 는 verified=false(화면은 productionRequired 만 본다)
      const { items } = await request.json();
      return ok({
        items: items.map(({ itemId, requiredQuantity }) => {
          const item = catalogItem(itemId);
          const inventoryQuantity = item ? stockOf(request, item).currentStock : 0;
          const shortageQuantity = Math.max(0, requiredQuantity - inventoryQuantity);
          return {
            itemId,
            itemName: item?.itemName ?? itemId,
            requiredQuantity,
            inventoryQuantity,
            shortageQuantity,
            statusCode: shortageQuantity > 0 ? 'INSUFFICIENT' : 'AVAILABLE',
            productionRequired: shortageQuantity > 0,
            inventoryCheckTime: isoNow,
          };
        }),
      });
    },
  ),
  http.post<{ quotationId: string }>(
    `${SALES_BASE_PATH}/quotations/:quotationId/approve-order`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to approve delivery process', 500);
      const state = salesState(request);
      const { quotationId } = params;
      // 모르는 id 는 상세 목처럼 첫 견적의 본문으로 답한다
      const found = quotesOf(request).find((q) => q.quotationId === quotationId);
      const quote = found ?? QUOTES[0].quote;
      state.quoteStatus.set(quotationId, 'APPROVAL');
      // 같은 견적을 또 눌러도 주문은 하나만 만든다
      const salesOrderId = `so-${quotationId}`;
      if (!state.createdOrders.some((order) => order.salesOrderId === salesOrderId)) {
        state.createdLines.set(salesOrderId, linesOf(request, found?.quotationId, 'qt-001'));
        addCreated(
          state.createdOrders,
          () => ({
            salesOrderId,
            salesOrderNumber: `SO-${quote.quotationNumber}`,
            customerName: quote.customerName,
            // 담당자는 고객 목록의 담당 영업 직원
            manager: (
              CUSTOMERS.find(({ customer }) => customer.customerName === quote.customerName) ??
              CUSTOMERS[0]
            ).customer.manager,
            orderDate: todayKey(),
            dueDate: quote.dueDate,
            totalAmount: quote.totalAmount,
            statusCode: 'READY_FOR_SHIPMENT',
          }),
          2,
          (dropped) => state.createdLines.delete(dropped.salesOrderId),
        );
      }
      return okNoData();
    },
  ),
  http.get(SALES_ENDPOINTS.CUSTOMERS_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load customers', 500);
    const { content, page } = paged(request, customersOf(request));
    return ok({ customers: content, page });
  }),
  http.get<{ customerId: string }>(
    `${SALES_BASE_PATH}/customers/:customerId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load customer detail', 500);
      const { customerId } = params;
      const state = salesState(request);
      // 목록의 그 행에서 만든다. 그 로그인의 목록에 없으면 404
      const customer = customersOf(request).find((row) => row.customerId === customerId);
      if (!customer) return notFound('고객사 상세 조회');
      const edit = state.customerEdits.get(customerId);
      const extra = extraOf(request, customerId) ?? CUSTOMERS[0].extra;
      return ok({
        customerId,
        customerNumber: customer.customerNumber,
        customerName: customer.customerName,
        ceoName: edit?.ceoName ?? extra.ceoName,
        businessNumber: edit?.businessNumber ?? extra.businessNumber,
        statusCode: customer.statusCode,
        customerPhone: edit?.customerPhone ?? extra.customerPhone,
        customerEmail: edit?.customerEmail ?? extra.customerEmail,
        baseAddress: edit?.baseAddress ?? extra.baseAddress,
        detailAddress: edit?.detailAddress ?? extra.detailAddress,
        manager: customer.manager,
        totalOrders: customer.orderCount,
        totalTransactionAmount: customer.totalTransactionAmount,
        note: edit?.note ?? extra.note,
      });
    },
  ),
  // 게이트웨이 SdController.java:210 모양. 봉투 한 겹, data 는 CreateAuthUserResultDto(담당자 계정 생성 결과)
  http.post<PathParams, Partial<Schema<'CustomerData'>>>(
    SALES_ENDPOINTS.CUSTOMERS_LIST,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create customer', 500);
      const state = salesState(request);
      const body = await request.json();
      addCreated(
        state.createdCustomers,
        (serial) => {
          state.customerExtras.set(`cus-${serial}`, {
            ceoName: body.ceoName ?? '',
            businessNumber: body.businessNumber ?? '',
            customerPhone: body.contactPhone ?? '',
            customerEmail: body.contactEmail ?? '',
            baseAddress: body.address ?? '',
            detailAddress: body.detailAddress ?? '',
            note: body.note ?? '',
          });
          return {
            customerId: `cus-${serial}`,
            customerNumber: `CUS-${serial}`,
            customerName: body.companyName ?? '',
            manager: {
              managerName: body.manager?.name ?? '',
              managerPhone: body.manager?.mobile ?? '',
              managerEmail: body.manager?.email ?? '',
            },
            address: [body.address, body.detailAddress].filter(Boolean).join(' '),
            totalTransactionAmount: 0,
            orderCount: 0,
            lastOrderDate: '',
            statusCode: 'ACTIVE',
          };
          // 기본 고객 다음 번호부터
        },
        CUSTOMERS.length + 1,
      );
      return ok({
        eventId: 'evt-customer-100',
        transactionId: 'tx-customer-100',
        success: true,
        userId: 'user-customer-100',
        failureReason: null,
      });
    },
  ),
  http.patch<{ customerId: string }, Partial<CustomerPatchBody>>(
    `${SALES_BASE_PATH}/customers/:customerId`,
    async ({ request, params }) => {
      if (shouldError(request)) return error('Failed to update customer', 500);
      const body = await request.json();
      salesState(request).customerEdits.set(params.customerId, body);
      return ok({
        data: {
          customerId: params.customerId,
          customerNumber: 'CUS-001',
          customerName: body.customerName ?? '한빛전자',
          ceoName: body.ceoName ?? '박대표',
          businessNumber: body.businessNumber ?? '123-45-67890',
          statusCode: body.statusCode ?? 'ACTIVE',
          customerPhone: body.customerPhone ?? '02-222-3333',
          customerEmail: body.customerEmail ?? 'contact@hanbit.co.kr',
          baseAddress: body.baseAddress ?? '서울특별시 강서구 공항대로 10',
          detailAddress: body.detailAddress ?? '5층',
          manager: {
            managerName: body.manager?.name ?? '김영업',
            managerPhone: body.manager?.mobile ?? '010-1111-2222',
            managerEmail: body.manager?.email ?? 'sales@everp.co.kr',
          },
          note: body.note ?? '',
        },
      });
    },
  ),
  http.get(SALES_ENDPOINTS.ANALYTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load analytics', 500);
    const url = new URL(request.url);
    return ok(
      salesAnalytics(request, url.searchParams.get('startDate'), url.searchParams.get('endDate')),
    );
  }),
  http.get(SALES_ENDPOINTS.NEW_QUOTE_ITEM_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load items', 500);
    return ok({
      products: [
        {
          itemId: MOTOR.itemId,
          itemNumber: MOTOR.itemNumber,
          itemName: MOTOR.itemName,
          uomName: 'EA',
          unitPrice: MOTOR.unitPrice,
        },
      ],
    });
  }),
];
