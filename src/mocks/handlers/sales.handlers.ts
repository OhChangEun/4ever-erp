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
import { toDateKey } from '@/app/utils/date';
import type { Schema } from '@/lib/api/contract';
import { addCreated, mockState } from '../state';
import { BEARING, MOTOR, line } from './catalog';
import { monthlyMetric } from './financeAnalytics.handlers';
import {
  ok,
  okNoData,
  error,
  notFound,
  shouldError,
  isoNow,
  makePage,
  flow,
  hashUnit,
  statResponse,
} from './utils';

type Quote = Schema<'Quote'>;
type Order = Schema<'Order'>;
type Customer = Schema<'SalesCustomer'>;
type Line = ReturnType<typeof line>;
/** 고객 상세에만 있는 칸. 목록 행(Customer)에 없다 */
type CustomerExtra = Pick<
  CustomerPatchBody,
  | 'ceoName'
  | 'businessNumber'
  | 'customerPhone'
  | 'customerEmail'
  | 'baseAddress'
  | 'detailAddress'
  | 'note'
>;

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

const mockOrders: Order[] = [
  {
    salesOrderId: 'so-001',
    salesOrderNumber: 'SO-2026-001',
    customerName: '한빛전자',
    manager: {
      managerName: '김영업',
      managerPhone: '010-1111-2222',
      managerEmail: 'sales@everp.co.kr',
    },
    orderDate: '2026-01-12',
    dueDate: '2026-02-05',
    totalAmount: 8600000,
    statusCode: 'IN_PRODUCTION',
  },
];

// 계약 견적 목록 status enum 의 상태마다 한 행. 데모에서 어느 필터를 골라도 표가 비지 않는다
const mockQuotes: Quote[] = [
  {
    quotationId: 'qt-001',
    quotationNumber: 'QT-2026-001',
    customerName: '한빛전자',
    managerName: '김영업',
    quotationDate: '2026-01-10',
    dueDate: '2026-02-01',
    totalAmount: 12500000,
    statusCode: 'APPROVAL',
  },
  {
    quotationId: 'qt-002',
    quotationNumber: 'QT-2026-002',
    customerName: '대성기계',
    managerName: '이영업',
    quotationDate: '2026-01-14',
    dueDate: '2026-02-10',
    totalAmount: 4300000,
    statusCode: 'PENDING',
  },
  {
    quotationId: 'qt-003',
    quotationNumber: 'QT-2026-003',
    customerName: '서진산업',
    managerName: '김영업',
    quotationDate: '2026-01-18',
    dueDate: '2026-02-15',
    totalAmount: 7800000,
    statusCode: 'REVIEW',
  },
  {
    quotationId: 'qt-004',
    quotationNumber: 'QT-2026-004',
    customerName: '한빛전자',
    managerName: '박영업',
    quotationDate: '2026-01-20',
    dueDate: '2026-02-20',
    totalAmount: 2100000,
    statusCode: 'REJECTED',
  },
];

/**
 * 기본 견적과 주문의 품목 줄. 줄 금액 합이 목록의 총액이다(카드 "목 데이터 현실성").
 * 단가는 품목표 값이고 총액을 바꾸지 않으려고 수량을 맞췄다
 */
const SEED_LINES: Partial<Record<string, Line[]>> = {
  'qt-001': [line(MOTOR, 875), line(BEARING, 250)],
  'qt-002': [line(MOTOR, 225), line(BEARING, 200)],
  'qt-003': [line(MOTOR, 450), line(BEARING, 300)],
  'qt-004': [line(MOTOR, 125), line(BEARING, 75)],
  'so-001': [line(MOTOR, 550), line(BEARING, 250)],
};
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
    : (salesState(request).createdLines.get(rowId) ?? SEED_LINES[rowId])) ??
  SEED_LINES[fallback] ??
  [];

/** 견적 상세의 대표자. 고객 목록에 있는 한빛전자 말고는 견적에만 나오는 고객이다 */
const CEO_BY_CUSTOMER: Partial<Record<string, string>> = {
  한빛전자: '박대표',
  대성기계: '김대표',
  서진산업: '정대표',
};

/** 기본 견적과 새로 만든 견적에 바뀐 상태를 덮은 목록 */
const quotesOf = (request: Request) => {
  const state = salesState(request);
  return [...mockQuotes, ...state.createdQuotes].map((quote) => ({
    ...quote,
    statusCode: state.quoteStatus.get(quote.quotationId) ?? quote.statusCode,
  }));
};

const ordersOf = (request: Request) => [...mockOrders, ...salesState(request).createdOrders];

const SEED_CUSTOMER: Customer = {
  customerId: 'cus-001',
  customerNumber: 'CUS-001',
  customerName: '한빛전자',
  manager: {
    managerName: '김영업',
    managerPhone: '010-1111-2222',
    managerEmail: 'sales@everp.co.kr',
  },
  address: '서울특별시 강서구 공항대로 10',
  totalTransactionAmount: 25000000,
  orderCount: 14,
  lastOrderDate: '2026-01-20',
  statusCode: 'ACTIVE',
};
const SEED_CUSTOMER_EXTRA: CustomerExtra = {
  ceoName: '박대표',
  businessNumber: '123-45-67890',
  customerPhone: '02-222-3333',
  customerEmail: 'contact@hanbit.co.kr',
  baseAddress: '서울특별시 강서구 공항대로 10',
  detailAddress: '5층',
  note: '중요 고객',
};

/** 고객 목록. 기본 고객과 새 고객에 수정한 이름, 상태, 담당자를 덮는다 */
const customersOf = (request: Request) => {
  const state = salesState(request);
  return [SEED_CUSTOMER, ...state.createdCustomers].map((customer) => {
    const edit = state.customerEdits.get(customer.customerId);
    return {
      ...customer,
      customerName: edit?.customerName ?? customer.customerName,
      statusCode: edit?.statusCode ?? customer.statusCode,
      manager: {
        managerName: edit?.manager?.name ?? customer.manager.managerName,
        managerPhone: edit?.manager?.mobile ?? customer.manager.managerPhone,
        managerEmail: edit?.manager?.email ?? customer.manager.managerEmail,
      },
    };
  });
};

/**
 * 매출 분석(카드 "목 데이터 현실성"). 요청 기간의 주(월요일 시작)마다 한 점이다. 점의 연, 월은 그 주 월요일과 시작일 중
 * 늦은 날의 것이고 주 번호는 그 달 안에서 센다. 값은 주의 날짜로 정해져(난수 없음) 같은 요청에 늘 같다.
 * 제품 비중과 주요 고객은 추이 매출 합을 나눈다. 기간이 없으면 끝은 오늘, 시작은 그 달 1일(verified=false, 서버 기본값 모름)
 */
const ANALYTICS_PRODUCTS = [
  { productCode: MOTOR.itemNumber, productName: MOTOR.itemName, weight: 5 },
  { productCode: BEARING.itemNumber, productName: BEARING.itemName, weight: 3 },
  { productCode: 'PRD-003', productName: '밸브 C', weight: 2 },
];
const ANALYTICS_CUSTOMERS = [
  {
    customerNumber: SEED_CUSTOMER.customerNumber,
    customerName: SEED_CUSTOMER.customerName,
    weight: 5,
  },
  { customerNumber: 'CUS-002', customerName: '대성기계', weight: 3 },
  { customerNumber: 'CUS-003', customerName: '서진산업', weight: 2 },
];
const DAY = 86_400_000;
const utcDate = (key: string) => new Date(`${key}T00:00:00Z`);
const dateKey = (date: Date) => date.toISOString().slice(0, 10);

/** 합 total 을 가중치대로 나눈다. 반올림 나머지는 첫 칸에 몰아 합이 total 과 같다 */
const split = (total: number, weights: number[]) => {
  const all = weights.reduce((sum, weight) => sum + weight, 0);
  const parts = weights.map((weight) => Math.floor((total * weight) / all));
  parts[0] += total - parts.reduce((sum, part) => sum + part, 0);
  return parts;
};

const salesAnalytics = (startDate: string | null, endDate: string | null) => {
  const end = endDate ?? dateKey(new Date());
  const start = startDate ?? `${end.slice(0, 8)}01`;
  // 시작이 끝보다 늦으면 같은 주여도 점이 없다(리뷰 A1. 카드 결정 5)
  const last = start > end ? Number.NEGATIVE_INFINITY : utcDate(end).getTime();
  const firstMonday = utcDate(start).getTime() - ((utcDate(start).getUTCDay() + 6) % 7) * DAY;
  const weekInMonth = new Map<string, number>();
  const trend = [];
  for (let monday = firstMonday; monday <= last; monday += 7 * DAY) {
    const at = new Date(Math.max(monday, utcDate(start).getTime()));
    const month = dateKey(at).slice(0, 7);
    const week = (weekInMonth.get(month) ?? 0) + 1;
    weekInMonth.set(month, week);
    const seed = hashUnit(dateKey(new Date(monday)));
    trend.push({
      year: at.getUTCFullYear(),
      month: at.getUTCMonth() + 1,
      week,
      sale: Math.round((150_000_000 + seed * 110_000_000) / 10_000) * 10_000,
      orderCount: 8 + Math.floor(seed * 13),
    });
  }
  const totalSale = trend.reduce((sum, point) => sum + point.sale, 0);
  const totalOrders = trend.reduce((sum, point) => sum + point.orderCount, 0);
  const productSales = split(
    totalSale,
    ANALYTICS_PRODUCTS.map((product) => product.weight),
  );
  const shares = split(
    100,
    ANALYTICS_PRODUCTS.map((product) => product.weight),
  );
  const customerSales = split(
    totalSale,
    ANALYTICS_CUSTOMERS.map((customer) => customer.weight),
  );
  const customerOrders = split(
    totalOrders,
    ANALYTICS_CUSTOMERS.map((customer) => customer.weight),
  );
  const range = (values: number[]) => ({
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
  });
  const lastMonday = firstMonday + (trend.length - 1) * 7 * DAY;
  return {
    period: {
      start,
      end,
      // 점이 없으면 주 범위도 요청 기간 그대로
      weekStart: trend.length ? dateKey(new Date(firstMonday)) : start,
      weekEnd: trend.length ? dateKey(new Date(lastMonday + 6 * DAY)) : end,
      weekCount: trend.length,
    },
    trend,
    trendScale: {
      sale: range(trend.map((point) => point.sale)),
      orderCount: range(trend.map((point) => point.orderCount)),
    },
    // 기간에 점이 없으면 나눌 매출이 없어 비중과 고객도 비운다
    productShare: trend.length
      ? ANALYTICS_PRODUCTS.map(({ productCode, productName }, i) => ({
          productCode,
          productName,
          sale: productSales[i],
          saleShare: shares[i],
        }))
      : [],
    topCustomers: trend.length
      ? ANALYTICS_CUSTOMERS.map(({ customerNumber, customerName }, i) => ({
          customerNumber,
          customerName,
          orderCount: customerOrders[i],
          sale: customerSales[i],
          active: true,
        }))
      : [],
  };
};

export const salesHandlers = [
  http.get(SALES_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load sales stats', 500);
    // 매출은 재무 월별 손익과 같은 값, 신규 주문 건수의 주 값은 그 로그인의 주문 목록 행 수(리뷰 관찰 1)
    return ok(
      statResponse({
        sales_amount: monthlyMetric('sales'),
        new_orders_count: flow(ordersOf(request).length),
      }),
    );
  }),
  http.get(SALES_ENDPOINTS.CSUTOMER_STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load customer stats', 500);
    // 주 값은 그 로그인의 견적 목록 행 수
    return ok(statResponse({ quotation_count: flow(quotesOf(request).length) }));
  }),
  http.get(SALES_ENDPOINTS.QUOTES_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load quotes', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    // 게이트웨이 목록 상태 값은 APPROVAL(SdController.java:101, QuotationListItemDto.java:20).
    // status 가 있으면 같은 상태만 준다. 옛 값 APPROVED 를 받으면 목은 빈 목록이다.
    // 실서버는 QuotationStatus.from 이 예외를 던질 수 있어 어떻게 답하는지 미확인
    const status = url.searchParams.get('status');
    const content = quotesOf(request).filter(
      (quote) => !status || status === 'ALL' || quote.statusCode === status,
    );
    return ok({ content, page: makePage(page, size, content.length) });
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
        ceoName: CEO_BY_CUSTOMER[quote.customerName] ?? '',
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
            ...mockQuotes[0],
            quotationId: `qt-${serial}`,
            quotationNumber: `QT-2026-${serial}`,
            quotationDate: toDateKey(new Date()),
            totalAmount: lines.reduce((sum, item) => sum + item.amount, 0),
            statusCode: 'PENDING',
          };
        },
        mockQuotes.length + 1,
        // 상한으로 밀려난 견적의 줄도 같이 지운다
        (dropped) => state.createdLines.delete(dropped.quotationId),
      );
      return ok({ items: body });
    },
  ),
  http.get(SALES_ENDPOINTS.ORDERS_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load orders', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    // 게이트웨이와 같은 이름(startDate, endDate)으로만 주문일을 거른다. 모르는 이름은 서버처럼 무시한다
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const content = ordersOf(request).filter(
      (order) =>
        (!startDate || order.orderDate >= startDate) && (!endDate || order.orderDate <= endDate),
    );
    return ok({ content, page: makePage(page, size, content.length) });
  }),
  http.get(`${SALES_BASE_PATH}/orders/:salesOrderId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load order detail', 500);
    const salesOrderId = String(params.salesOrderId);
    // 목록의 그 행에서 만든다. 그 로그인의 목록에 없으면 404
    const order = ordersOf(request).find((row) => row.salesOrderId === salesOrderId);
    if (!order) return notFound('주문서 상세 조회');
    // 고객 목록에 있는 고객이면 그 정보, 견적에만 나오는 고객(즉시 납품으로 만든 주문)은 이름만 안다
    const customer = customersOf(request).find((row) => row.customerName === order.customerName);
    const extra =
      customer &&
      (salesState(request).customerExtras.get(customer.customerId) ?? SEED_CUSTOMER_EXTRA);
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
  http.post(SALES_ENDPOINTS.INVENTORY_CHECK, ({ request }) => {
    if (shouldError(request)) return error('Failed to check inventory', 500);
    return ok({
      items: [
        {
          itemId: 'item-1001',
          itemName: '모터 A',
          requiredQuantity: 100,
          inventoryQuantity: 120,
          shortageQuantity: 0,
          statusCode: 'AVAILABLE',
          productionRequired: false,
          inventoryCheckTime: isoNow,
        },
      ],
    });
  }),
  http.post<{ quotationId: string }>(
    `${SALES_BASE_PATH}/quotations/:quotationId/approve-order`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to approve delivery process', 500);
      const state = salesState(request);
      const { quotationId } = params;
      // 모르는 id 는 상세 목처럼 첫 견적의 본문으로 답한다
      const found = quotesOf(request).find((q) => q.quotationId === quotationId);
      const quote = found ?? mockQuotes[0];
      state.quoteStatus.set(quotationId, 'APPROVAL');
      // 같은 견적을 또 눌러도 주문은 하나만 만든다
      const salesOrderId = `so-${quotationId}`;
      if (!state.createdOrders.some((order) => order.salesOrderId === salesOrderId)) {
        state.createdLines.set(salesOrderId, linesOf(request, found?.quotationId, 'qt-001'));
        addCreated(
          state.createdOrders,
          () => ({
            ...mockOrders[0],
            salesOrderId,
            salesOrderNumber: `SO-${quote.quotationNumber}`,
            customerName: quote.customerName,
            orderDate: toDateKey(new Date()),
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
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const customers = customersOf(request);
    return ok({ customers, page: makePage(page, size, customers.length) });
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
      const extra = state.customerExtras.get(customerId) ?? SEED_CUSTOMER_EXTRA;
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
      addCreated(state.createdCustomers, (serial) => {
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
      });
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
    return ok(salesAnalytics(url.searchParams.get('startDate'), url.searchParams.get('endDate')));
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
