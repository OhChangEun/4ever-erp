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
import { ok, okNoData, error, shouldError, isoNow, makePage, stat, statResponse } from './utils';

type Quote = Schema<'Quote'>;
type Order = Schema<'Order'>;
type Customer = Schema<'SalesCustomer'>;

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
}>(() => ({
  quoteStatus: new Map(),
  createdQuotes: [],
  createdOrders: [],
  createdCustomers: [],
  customerEdits: new Map(),
}));

const mockSalesStats = statResponse({
  sales_amount: stat,
  new_orders_count: stat,
});

const mockCustomerSalesStats = statResponse({
  quotation_count: stat,
});

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

/** 기본 견적과 새로 만든 견적에 바뀐 상태를 덮은 목록 */
const quotesOf = (request: Request) => {
  const state = salesState(request);
  return [...mockQuotes, ...state.createdQuotes].map((quote) => ({
    ...quote,
    statusCode: state.quoteStatus.get(quote.quotationId) ?? quote.statusCode,
  }));
};

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

export const salesHandlers = [
  http.get(SALES_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load sales stats', 500);
    return ok(mockSalesStats);
  }),
  http.get(SALES_ENDPOINTS.CSUTOMER_STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load customer stats', 500);
    return ok(mockCustomerSalesStats);
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
      return ok({
        quotationId,
        quotationNumber: 'QT-2026-001',
        quotationDate: '2026-01-10',
        dueDate: '2026-02-01',
        // 게이트웨이 견적 상태 enum 은 APPROVAL(QuotationStatus.java:13). 목록에 있는 견적이면 목록과 같은 상태
        // (검토 요청이나 즉시 납품의 결과 포함). 목록에 없는 id 는 예전처럼 고정 본문의 APPROVAL
        statusCode:
          quotesOf(request).find((quote) => quote.quotationId === quotationId)?.statusCode ??
          salesState(request).quoteStatus.get(quotationId) ??
          'APPROVAL',
        customerName: '한빛전자',
        ceoName: '박대표',
        items: [
          {
            itemId: 'item-1001',
            itemName: '모터 A',
            quantity: 100,
            uomName: 'EA',
            unitPrice: 12000,
            amount: 1200000,
          },
        ],
        totalAmount: 12500000,
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
      addCreated(
        state.createdQuotes,
        (serial) => ({
          ...mockQuotes[0],
          quotationId: `qt-${serial}`,
          quotationNumber: `QT-2026-${serial}`,
          quotationDate: toDateKey(new Date()),
          totalAmount: body.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
          statusCode: 'PENDING',
        }),
        mockQuotes.length + 1,
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
    const content = [...mockOrders, ...salesState(request).createdOrders].filter(
      (order) =>
        (!startDate || order.orderDate >= startDate) && (!endDate || order.orderDate <= endDate),
    );
    return ok({ content, page: makePage(page, size, content.length) });
  }),
  http.get(`${SALES_BASE_PATH}/orders/:salesOrderId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load order detail', 500);
    const { salesOrderId } = params;
    return ok({
      order: {
        salesOrderId: String(salesOrderId),
        salesOrderNumber: 'SO-2026-001',
        orderDate: '2026-01-12',
        dueDate: '2026-02-05',
        statusCode: 'IN_PRODUCTION',
        totalAmount: 8600000,
      },
      customer: {
        // 게이트웨이 OrderCustomerDto.java:11 모양. customerId 는 문자열, customerCode 는 없다
        customerId: 'cus-001',
        customerName: '한빛전자',
        customerBaseAddress: '서울시 강서구 공항대로 10',
        customerDetailAddress: '5층',
        manager: {
          managerName: '김영업',
          managerPhone: '010-1111-2222',
          managerEmail: 'sales@everp.co.kr',
        },
      },
      items: [
        {
          itemId: 'item-1001',
          itemName: '모터 A',
          quantity: 100,
          uonName: 'EA',
          unitPrice: 12000,
          amount: 1200000,
        },
      ],
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
      const quote = quotesOf(request).find((q) => q.quotationId === quotationId) ?? mockQuotes[0];
      state.quoteStatus.set(quotationId, 'APPROVAL');
      // 같은 견적을 또 눌러도 주문은 하나만 만든다
      const salesOrderId = `so-${quotationId}`;
      if (!state.createdOrders.some((order) => order.salesOrderId === salesOrderId)) {
        addCreated(state.createdOrders, () => ({
          ...mockOrders[0],
          salesOrderId,
          salesOrderNumber: `SO-${quote.quotationNumber}`,
          customerName: quote.customerName,
          orderDate: toDateKey(new Date()),
          dueDate: quote.dueDate,
          totalAmount: quote.totalAmount,
          statusCode: 'READY_FOR_SHIPMENT',
        }));
      }
      return okNoData();
    },
  ),
  http.get(SALES_ENDPOINTS.CUSTOMERS_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load customers', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const state = salesState(request);
    const customers = [SEED_CUSTOMER, ...state.createdCustomers].map((customer) => {
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
    return ok({ customers, page: makePage(page, size, customers.length) });
  }),
  http.get<{ customerId: string }>(
    `${SALES_BASE_PATH}/customers/:customerId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load customer detail', 500);
      const { customerId } = params;
      const edit = salesState(request).customerEdits.get(customerId);
      return ok({
        customerId,
        customerNumber: 'CUS-001',
        customerName: edit?.customerName ?? '한빛전자',
        ceoName: edit?.ceoName ?? '박대표',
        businessNumber: edit?.businessNumber ?? '123-45-67890',
        statusCode: edit?.statusCode ?? 'ACTIVE',
        customerPhone: edit?.customerPhone ?? '02-222-3333',
        customerEmail: edit?.customerEmail ?? 'contact@hanbit.co.kr',
        baseAddress: edit?.baseAddress ?? '서울특별시 강서구 공항대로 10',
        detailAddress: edit?.detailAddress ?? '5층',
        manager: {
          managerName: edit?.manager?.name ?? '김영업',
          managerPhone: edit?.manager?.mobile ?? '010-1111-2222',
          managerEmail: edit?.manager?.email ?? 'sales@everp.co.kr',
        },
        totalOrders: 14,
        totalTransactionAmount: 25000000,
        note: edit?.note ?? '중요 고객',
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
      addCreated(state.createdCustomers, (serial) => ({
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
      }));
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
    return ok({
      period: {
        start: '2026-01-01',
        end: '2026-01-31',
        weekStart: '2026-01-01',
        weekEnd: '2026-01-07',
        weekCount: 5,
      },
      trend: [
        { year: 2026, month: 1, week: 1, sale: 1200000, orderCount: 12 },
        { year: 2026, month: 1, week: 2, sale: 1500000, orderCount: 15 },
      ],
      trendScale: {
        sale: { min: 1000000, max: 2000000 },
        orderCount: { min: 10, max: 20 },
      },
      productShare: [
        { productCode: 'P-1001', productName: '모터 A', sale: 5000000, saleShare: 40 },
      ],
      // 게이트웨이 TopCustomerDto.java:15 이름(customerNumber)
      topCustomers: [
        {
          customerNumber: 'CUS-001',
          customerName: '한빛전자',
          orderCount: 5,
          sale: 8000000,
          active: true,
        },
      ],
    });
  }),
  http.get(SALES_ENDPOINTS.NEW_QUOTE_ITEM_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load items', 500);
    return ok({
      products: [
        {
          itemId: 'item-1001',
          itemNumber: 'ITM-1001',
          itemName: '모터 A',
          uomName: 'EA',
          unitPrice: 12000,
        },
      ],
    });
  }),
];
