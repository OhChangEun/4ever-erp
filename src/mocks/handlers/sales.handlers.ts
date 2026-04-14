import { http } from 'msw';
import { SALES_BASE_PATH, SALES_ENDPOINTS } from '@/app/types/api';
import { ok, okNoData, error, shouldError, isoNow, makePage, stat, statResponse } from './utils';

const mockSalesStats = statResponse({
  sales_amount: stat,
  new_orders_count: stat,
});

const mockCustomerSalesStats = statResponse({
  quotation_count: stat,
});

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
    return ok({
      content: [
        {
          quotationId: 'qt-001',
          quotationNumber: 'QT-2026-001',
          customerName: '한빛전자',
          managerName: '김영업',
          quotationDate: '2026-01-10',
          dueDate: '2026-02-01',
          totalAmount: 12500000,
          statusCode: 'APPROVED',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(`${SALES_BASE_PATH}/quotations/:quotationId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load quote detail', 500);
    const { quotationId } = params;
    return ok({
      quotationId,
      quotationNumber: 'QT-2026-001',
      quotationDate: '2026-01-10',
      dueDate: '2026-02-01',
      statusCode: 'APPROVED',
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
  http.post(SALES_ENDPOINTS.NEW_ORDER, async ({ request }) => {
    if (shouldError(request)) return error('Failed to create quote', 500);
    const body = (await request.json()) as { items: Array<{ itemId: string; quantity: number }> };
    return ok({ items: body });
  }),
  http.get(SALES_ENDPOINTS.ORDERS_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load orders', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
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
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(`${SALES_BASE_PATH}/orders/:salesOrderId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load order detail', 500);
    const { salesOrderId } = params;
    return ok({
      order: {
        salesOrderId: Number(salesOrderId) || 1,
        salesOrderNumber: 'SO-2026-001',
        orderDate: '2026-01-12',
        dueDate: '2026-02-05',
        statusCode: 'IN_PRODUCTION',
        totalAmount: 8600000,
      },
      customer: {
        customerId: 1,
        customerName: '한빛전자',
        customerCode: 'CUS-001',
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
  http.post(SALES_ENDPOINTS.CUSTOMERS_LIST, async ({ request }) => {
    if (shouldError(request)) return error('Failed to create customer', 500);
    const body = await request.json();
    return ok({
      status: 200,
      success: true,
      message: 'created',
      data: {
        customerId: 100,
        customerCode: 'CUS-100',
        companyName: (body as any).companyName ?? '신규 고객사',
        ceoName: (body as any).ceoName ?? '대표',
        businessNumber: (body as any).businessNumber ?? '123-45-67890',
        statusCode: 'ACTIVE',
        statusLabel: '활성',
        contactPhone: (body as any).contactPhone ?? '010-0000-0000',
        contactEmail: (body as any).contactEmail ?? 'new@company.com',
        address: (body as any).address ?? '서울특별시',
        manager: (body as any).manager ?? {
          name: '담당자',
          mobile: '010-0000-0000',
          email: 'manager@company.com',
        },
        totalOrders: 0,
        totalTransactionAmount: 0,
        currency: 'KRW',
        note: (body as any).note ?? '',
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    });
  }),
  http.patch(`${SALES_BASE_PATH}/customers/:customerId`, async ({ request, params }) => {
    if (shouldError(request)) return error('Failed to update customer', 500);
    const body = await request.json();
    return ok({
      data: {
        customerId: params.customerId,
        customerNumber: 'CUS-001',
        customerName: (body as any).customerName ?? '한빛전자',
        ceoName: (body as any).ceoName ?? '박대표',
        businessNumber: (body as any).businessNumber ?? '123-45-67890',
        statusCode: (body as any).statusCode ?? 'ACTIVE',
        customerPhone: (body as any).customerPhone ?? '02-222-3333',
        customerEmail: (body as any).customerEmail ?? 'contact@hanbit.co.kr',
        baseAddress: (body as any).baseAddress ?? '서울특별시 강서구 공항대로 10',
        detailAddress: (body as any).detailAddress ?? '5층',
        manager: {
          managerName: (body as any).manager?.name ?? '김영업',
          managerPhone: (body as any).manager?.mobile ?? '010-1111-2222',
          managerEmail: (body as any).manager?.email ?? 'sales@everp.co.kr',
        },
        note: (body as any).note ?? '',
      },
    });
  }),
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
      topCustomers: [
        {
          customerCode: 'CUS-001',
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
