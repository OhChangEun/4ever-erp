import { http, type PathParams } from 'msw';

interface ManagerBody {
  name: string;
  mobile: string;
  email: string;
}

interface NewCustomerBody {
  companyName: string;
  ceoName: string;
  businessNumber: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  manager: ManagerBody;
  note: string;
}

interface CustomerPatchBody {
  customerName: string;
  ceoName: string;
  businessNumber: string;
  statusCode: string;
  customerPhone: string;
  customerEmail: string;
  baseAddress: string;
  detailAddress: string;
  manager: Partial<ManagerBody>;
  note: string;
}
import { SALES_BASE_PATH, SALES_ENDPOINTS } from '@/app/types/api';
import { ok, okNoData, error, shouldError, isoNow, makePage, stat, statResponse } from './utils';

const mockSalesStats = statResponse({
  sales_amount: stat,
  new_orders_count: stat,
});

const mockCustomerSalesStats = statResponse({
  quotation_count: stat,
});

const mockOrders = [
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
const mockQuotes = [
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
    const content = mockQuotes.filter(
      (quote) => !status || status === 'ALL' || quote.statusCode === status,
    );
    return ok({ content, page: makePage(page, size, content.length) });
  }),
  http.get(`${SALES_BASE_PATH}/quotations/:quotationId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load quote detail', 500);
    const { quotationId } = params;
    return ok({
      quotationId,
      quotationNumber: 'QT-2026-001',
      quotationDate: '2026-01-10',
      dueDate: '2026-02-01',
      // 게이트웨이 견적 상태 enum 은 APPROVAL(QuotationStatus.java:13)
      statusCode: 'APPROVAL',
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
  }),
  http.post<PathParams, { items: Array<{ itemId: string; quantity: number }> }>(
    SALES_ENDPOINTS.NEW_ORDER,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create quote', 500);
      const body = await request.json();
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
    const content = mockOrders.filter(
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
  http.post(SALES_ENDPOINTS.QUOTE_CONFIRM, ({ request }) => {
    if (shouldError(request)) return error('Failed to confirm quote', 500);
    return okNoData();
  }),
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
  http.post(`${SALES_BASE_PATH}/quotations/:quotationId/approve-order`, ({ request }) => {
    if (shouldError(request)) return error('Failed to approve delivery process', 500);
    return okNoData();
  }),
  http.get(SALES_ENDPOINTS.CUSTOMERS_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load customers', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      customers: [
        {
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
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(`${SALES_BASE_PATH}/customers/:customerId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load customer detail', 500);
    const { customerId } = params;
    return ok({
      customerId,
      customerNumber: 'CUS-001',
      customerName: '한빛전자',
      ceoName: '박대표',
      businessNumber: '123-45-67890',
      statusCode: 'ACTIVE',
      customerPhone: '02-222-3333',
      customerEmail: 'contact@hanbit.co.kr',
      baseAddress: '서울특별시 강서구 공항대로 10',
      detailAddress: '5층',
      manager: {
        managerName: '김영업',
        managerPhone: '010-1111-2222',
        managerEmail: 'sales@everp.co.kr',
      },
      totalOrders: 14,
      totalTransactionAmount: 25000000,
      note: '중요 고객',
    });
  }),
  // 목은 받은 값을 그대로 돌려준다. 빠진 필드는 기본값. 본문 모양은 화면이 보내는 요청 타입의 부분집합
  http.post<PathParams, Partial<NewCustomerBody>>(
    SALES_ENDPOINTS.CUSTOMERS_LIST,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create customer', 500);
      const body = await request.json();
      return ok({
        status: 200,
        success: true,
        message: 'created',
        data: {
          customerId: 100,
          customerCode: 'CUS-100',
          companyName: body.companyName ?? '신규 고객사',
          ceoName: body.ceoName ?? '대표',
          businessNumber: body.businessNumber ?? '123-45-67890',
          statusCode: 'ACTIVE',
          statusLabel: '활성',
          contactPhone: body.contactPhone ?? '010-0000-0000',
          contactEmail: body.contactEmail ?? 'new@company.com',
          address: body.address ?? '서울특별시',
          manager: body.manager ?? {
            name: '담당자',
            mobile: '010-0000-0000',
            email: 'manager@company.com',
          },
          totalOrders: 0,
          totalTransactionAmount: 0,
          currency: 'KRW',
          note: body.note ?? '',
          createdAt: isoNow,
          updatedAt: isoNow,
        },
      });
    },
  ),
  http.patch<{ customerId: string }, Partial<CustomerPatchBody>>(
    `${SALES_BASE_PATH}/customers/:customerId`,
    async ({ request, params }) => {
      if (shouldError(request)) return error('Failed to update customer', 500);
      const body = await request.json();
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
