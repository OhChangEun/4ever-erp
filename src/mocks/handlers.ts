import { http, HttpResponse } from 'msw';
import {
  DASHBOARD_ENDPOINTS,
  FINANCE_BASE_PATH,
  FINANCE_ENDPOINTS,
  INVENTORY_BASE_PATH,
  INVENTORY_ENDPOINTS,
  LOWSTOCK_ENDPOINTS,
  PROFILE_BASE_PATH,
  PROFILE_ENDPOINTS,
  SALES_BASE_PATH,
  SALES_ENDPOINTS,
  USER_ENDPOINTS,
  WAREHOUSE_ENDPOINTS,
} from '@/app/types/api';
import { NOTIFICATION_BASE_PATH, NOTIFICATION_ENDPOINTS } from '@/lib/api/notification.endpoints';
import {
  PURCHASE_BASE_PATH,
  PURCHASE_ENDPOINTS,
} from '@/app/(private)/purchase/api/purchase.endpoints';
import {
  PRODUCTION_BASE_PATH,
  PRODUCTION_ENDPOINTS,
} from '@/app/(private)/production/api/production.endpoints';
import { HRM_BASE_PATH, HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';

const now = new Date();
const isoNow = now.toISOString();

const stat = { value: 1200, delta_rate: 0.12 };
const statResponse = <T>(data: T) => ({
  week: data,
  month: data,
  quarter: data,
  year: data,
});

const makePage = (page = 0, size = 10, totalElements = 2) => {
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  return {
    number: page,
    size,
    totalElements,
    totalPages,
    hasNext: page + 1 < totalPages,
  };
};

const ok = <T>(data: T) => HttpResponse.json({ status: 200, success: true, message: 'OK', data });
const okNoData = () => HttpResponse.json({ status: 200, success: true, message: 'OK' });
const error = (message = 'Mock error', status = 500) =>
  HttpResponse.json({ status, success: false, message }, { status });
const shouldError = (request: Request) => {
  const url = new URL(request.url);
  return (
    url.searchParams.get('mockError') === 'true' || request.headers.get('x-mock-error') === 'true'
  );
};

const mockUserInfo = {
  id: 1,
  name: '홍길동',
  email: 'hong@test.com',
  role: 'USER',
};

const mockProfileInfo = {
  name: '홍길동',
  employeeNumber: 'EMP-2026-001',
  department: '영업팀',
  position: '팀장',
  hireDate: '2022-03-01',
  serviceYears: '3',
  email: 'user@everp.co.kr',
  phoneNumber: '010-1234-5678',
  address: '서울특별시 강남구 테헤란로 123',
  companyName: '에버피',
  baseAddress: '서울특별시 강남구 테헤란로 123',
  detailAddress: '10층',
  officePhone: '02-123-4567',
  businessNumber: '123-45-67890',
  customerName: '홍길동',
};

const mockNotificationList = {
  content: [
    {
      notificationId: 'ntf-001',
      notificationTitle: '발주 승인 요청',
      notificationMessage: 'PO-2026-001 승인 요청이 도착했습니다.',
      linkType: 'PURCHASE_ORDER',
      linkId: 'po-001',
      source: 'PR',
      createdAt: isoNow,
      isRead: false,
    },
    {
      notificationId: 'ntf-002',
      notificationTitle: '재고 부족 경고',
      notificationMessage: 'ITEM-1002의 재고가 안전재고 이하입니다.',
      linkType: 'INVENTORY',
      linkId: 'item-1002',
      source: 'IM',
      createdAt: isoNow,
      isRead: true,
    },
  ],
  page: makePage(0, 10, 2),
};

const mockSalesStats = statResponse({
  sales_amount: stat,
  new_orders_count: stat,
});

const mockCustomerSalesStats = statResponse({
  quotation_count: stat,
});

const mockFinanceStats = statResponse({
  total_purchases: stat,
  net_profit: stat,
  total_sales: stat,
});

const mockCustomerSupplierStats = statResponse({
  total_amount: stat,
});

const mockDashboardStats = statResponse({
  total_sales: stat,
  total_purchases: stat,
  net_profit: stat,
  total_employees: stat,
});

const mockInventoryStats = statResponse({
  total_stock: stat,
  store_complete: stat,
  store_pending: stat,
  delivery_complete: stat,
  delivery_pending: stat,
});

const mockWarehouseStats = statResponse({
  total_warehouse: stat,
  in_operation_warehouse: stat,
});

const mockLowStockStats = statResponse({
  total_emergency: stat,
  total_warning: stat,
});

const mockPurchaseStats = statResponse({
  purchaseOrderAmount: stat,
  purchaseRequestCount: stat,
});

const mockSupplierOrderStats = statResponse({
  orderCount: stat,
});

const mockProductionStats = statResponse({
  production_in: stat,
  production_completed: stat,
  bom_count: stat,
});

// ---- 낙관적 락 시뮬레이션: BOM 서버 측 버전 상태 ----
// 실제 백엔드라면 DB의 version 컬럼이 이 역할을 함
// MSW에서는 모듈 레벨 변수로 서버 버전을 흉내냄
const bomServerVersions: Record<string, string> = {};
const getBomVersion = (bomId: string) => bomServerVersions[bomId] ?? 'v1';
const bumpBomVersion = (bomId: string): string => {
  const current = getBomVersion(bomId);
  const next = `v${parseInt(current.replace('v', ''), 10) + 1}`;
  bomServerVersions[bomId] = next;
  return next;
};

const mockHrmStats = statResponse({
  totalEmployeeCount: stat,
  newEmployeeCount: stat,
});

export const handlers = [
  // ----------------------- Auth -----------------------
  http.post(USER_ENDPOINTS.LOGIN, async ({ request }) => {
    if (shouldError(request)) return error('Unauthorized', 401);
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      user: mockUserInfo,
    });
  }),
  http.post(USER_ENDPOINTS.LOGOUT, ({ request }) => {
    if (shouldError(request)) return error('Logout failed', 500);
    return okNoData();
  }),
  http.get(USER_ENDPOINTS.USER_INFO, ({ request }) => {
    if (shouldError(request)) return error('Unauthorized', 401);
    return ok(mockUserInfo);
  }),
  http.get(USER_ENDPOINTS.USER_PROFILE_INFO, ({ request }) => {
    if (shouldError(request)) return error('Unauthorized', 401);
    return ok(mockProfileInfo);
  }),

  // ----------------------- Notification -----------------------
  http.get(NOTIFICATION_ENDPOINTS.LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load notifications', 500);
    return ok(mockNotificationList);
  }),
  http.get(NOTIFICATION_ENDPOINTS.COUNT, ({ request }) => {
    if (shouldError(request)) return error('Failed to load notification count', 500);
    return ok({ count: 2 });
  }),
  http.patch(`${NOTIFICATION_BASE_PATH}/:notificationId/read`, ({ request }) => {
    if (shouldError(request)) return error('Failed to mark as read', 500);
    return okNoData();
  }),
  http.patch(NOTIFICATION_ENDPOINTS.READ_ALL, ({ request }) => {
    if (shouldError(request)) return error('Failed to mark all as read', 500);
    return okNoData();
  }),
  http.get(NOTIFICATION_ENDPOINTS.SUBSCRIBE, ({ request }) => {
    if (shouldError(request)) return error('Unauthorized', 401);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: string) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        };

        send('keepalive', 'connected');
        send('unreadCount', '2');

        setTimeout(() => {
          send(
            'alarm',
            JSON.stringify({
              alarmId: 'alarm-001',
              alarmType: 'INFO',
              targetId: 'po-001',
              title: '발주 승인 요청',
              message: 'PO-2026-001 승인 요청이 도착했습니다.',
              linkId: 'po-001',
              linkType: 'PURCHASE_ORDER',
            }),
          );
        }, 500);

        setTimeout(() => controller.close(), 1500);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
  }),

  // ----------------------- Dashboard -----------------------
  http.get(DASHBOARD_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load dashboard stats', 500);
    return ok(mockDashboardStats);
  }),
  http.get(DASHBOARD_ENDPOINTS.WORKFLOW_STATUS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load workflow status', 500);
    return ok({
      tabs: [
        {
          tabCode: 'APPROVAL',
          items: [
            {
              itemId: 'wf-001',
              itemTitle: '구매요청 승인',
              itemNumber: 'PR-2026-001',
              name: '김구매',
              statusCode: 'PENDING',
              date: isoNow,
            },
          ],
        },
      ],
    });
  }),

  // ----------------------- Sales -----------------------
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

  // ----------------------- Finance -----------------------
  http.get(FINANCE_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load finance stats', 500);
    return ok(mockFinanceStats);
  }),
  http.get(FINANCE_ENDPOINTS.CUSTOMER_STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load customer stats', 500);
    return ok(mockCustomerSupplierStats);
  }),
  http.get(FINANCE_ENDPOINTS.SUPPLIER_STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier stats', 500);
    return ok(mockCustomerSupplierStats);
  }),
  http.get(FINANCE_ENDPOINTS.PURCHASE_INVOICES_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load purchase invoices', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          invoiceId: 'inv-ap-001',
          invoiceNumber: 'AP-2026-001',
          connection: {
            connectionId: 'sup-001',
            connectionCode: 'SUP-001',
            connectionName: '대양상사',
          },
          totalAmount: 4200000,
          issueDate: '2026-01-15',
          dueDate: '2026-02-15',
          statusCode: 'UNPAID',
          referenceNumber: 'REF-AP-001',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(`${FINANCE_ENDPOINTS.PURCHASE_INVOICES_LIST}/:invoiceId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load purchase invoice detail', 500);
    return ok({
      invoiceId: params.invoiceId,
      invoiceNumber: 'AP-2026-001',
      invoiceType: 'AP',
      statusCode: 'UNPAID',
      issueDate: '2026-01-15',
      dueDate: '2026-02-15',
      name: '대양상사',
      referenceNumber: 'REF-AP-001',
      totalAmount: 4200000,
      note: '납기 준수 요청',
      items: [
        {
          itemId: 'item-2001',
          itemName: '원자재 A',
          quantity: 200,
          unitOfMaterialName: 'EA',
          unitPrice: 20000,
          totalPrice: 4000000,
        },
      ],
    });
  }),
  http.post(new RegExp(`${FINANCE_BASE_PATH}/invoice/ap/receivable/request`), ({ request }) => {
    if (shouldError(request)) return error('Failed to request AP', 500);
    return okNoData();
  }),
  http.post(new RegExp(`${FINANCE_BASE_PATH}/invoice/ar/.+/receivable/complete`), ({ request }) => {
    if (shouldError(request)) return error('Failed to complete AR', 500);
    return okNoData();
  }),
  http.post(new RegExp(`${FINANCE_BASE_PATH}/invoice/ap/.+/payable/complete`), ({ request }) => {
    if (shouldError(request)) return error('Failed to complete supplier AP', 500);
    return okNoData();
  }),
  http.get(FINANCE_ENDPOINTS.SALES_INVOICES_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load sales invoices', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          invoiceId: 'inv-ar-001',
          invoiceNumber: 'AR-2026-001',
          connection: {
            connectionId: 'cus-001',
            connectionCode: 'CUS-001',
            connectionName: '한빛전자',
          },
          totalAmount: 8200000,
          issueDate: '2026-01-20',
          dueDate: '2026-02-20',
          statusCode: 'PENDING',
          referenceNumber: 'REF-AR-001',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(`${FINANCE_ENDPOINTS.SALES_INVOICES_LIST}/:invoiceId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load sales invoice detail', 500);
    return ok({
      invoiceId: params.invoiceId,
      invoiceNumber: 'AR-2026-001',
      invoiceType: 'AR',
      statusCode: 'PENDING',
      issueDate: '2026-01-20',
      dueDate: '2026-02-20',
      name: '한빛전자',
      referenceNumber: 'REF-AR-001',
      totalAmount: 8200000,
      note: '입금 대기',
      items: [
        {
          itemId: 'item-1001',
          itemName: '모터 A',
          quantity: 100,
          unitOfMaterialName: 'EA',
          unitPrice: 82000,
          totalPrice: 8200000,
        },
      ],
    });
  }),

  // ----------------------- Inventory -----------------------
  http.get(INVENTORY_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load inventory stats', 500);
    return ok(mockInventoryStats);
  }),
  http.get(INVENTORY_ENDPOINTS.INVENTORY_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load inventory list', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          itemId: 'item-1001',
          itemNumber: 'ITM-1001',
          itemName: '모터 A',
          category: 'MOTOR',
          currentStock: 120,
          forShipmentStock: 30,
          reservedStock: 10,
          safetyStock: 50,
          uomName: 'EA',
          unitPrice: 12000,
          totalAmount: 1440000,
          warehouseName: '1공장 창고',
          warehouseType: 'RAW',
          statusCode: 'NORMAL',
          shelfNumber: 12,
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(`${INVENTORY_BASE_PATH}/iv/items/:itemId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load inventory detail', 500);
    return ok({
      itemId: params.itemId,
      itemNumber: 'ITM-1001',
      itemName: '모터 A',
      category: 'MOTOR',
      supplierCompanyName: '대양상사',
      statusCode: 'NORMAL',
      currentStock: 120,
      safetyStock: 50,
      uomName: 'EA',
      unitPrice: 12000,
      totalAmount: 1440000,
      warehouseId: 'wh-001',
      warehouseName: '1공장 창고',
      warehouseNumber: 'WH-001',
      location: 'A-1',
      lastModified: isoNow,
      description: '표준 모터',
      stockMovement: [
        {
          type: 'IN',
          quantity: 50,
          uomName: 'EA',
          from: '대양상사',
          to: '1공장 창고',
          movementDate: isoNow,
          managerName: '이자재',
          referenceNumber: 'IN-2026-001',
          note: '정상 입고',
        },
      ],
    });
  }),
  http.get(INVENTORY_ENDPOINTS.LOW_STOCK, ({ request }) => {
    if (shouldError(request)) return error('Failed to load low stock', 500);
    return ok({
      content: [
        {
          itemId: 'item-1002',
          itemName: '베어링 B',
          currentStock: 20,
          uomName: 'EA',
          safetyStock: 50,
          statusCode: 'URGENT',
        },
      ],
    });
  }),
  http.get(INVENTORY_ENDPOINTS.RECENT_STOCK_MOVEMENT, ({ request }) => {
    if (shouldError(request)) return error('Failed to load stock movement', 500);
    return ok({
      content: [
        {
          type: 'OUT',
          quantity: 10,
          uomName: 'EA',
          itemName: '모터 A',
          workDate: '2026-01-25',
          managerName: '이자재',
        },
      ],
    });
  }),
  http.post(INVENTORY_ENDPOINTS.RECENT_STOCK_MOVEMENT, ({ request }) => {
    if (shouldError(request)) return error('Failed to post stock movement', 500);
    return okNoData();
  }),
  http.patch(new RegExp(`${INVENTORY_BASE_PATH}/iv/items/[^/]+/safety-stock`), ({ request }) => {
    if (shouldError(request)) return error('Failed to update safety stock', 500);
    return okNoData();
  }),
  http.get(INVENTORY_ENDPOINTS.PRODUCTION_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load production list', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          salesOrderId: 'so-001',
          salesOrderNumber: 'SO-2026-001',
          customerName: '한빛전자',
          orderDate: '2026-01-12',
          dueDate: '2026-02-05',
          progress: 60,
          totalAmount: 8600000,
          statusCode: 'PRODUCTION',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(INVENTORY_ENDPOINTS.READY_TO_SHIP_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load ready-to-ship list', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          salesOrderId: 'so-002',
          salesOrderNumber: 'SO-2026-002',
          customerName: '미래전자',
          orderDate: '2026-01-10',
          dueDate: '2026-02-02',
          productionCompletionDate: '2026-01-25',
          readyToShipDate: '2026-01-26',
          totalAmount: 5200000,
          statusCode: 'READT_TO_SHIP',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(`${INVENTORY_BASE_PATH}/sales-orders/production/:itemId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load production detail', 500);
    return ok({
      salesOrderId: params.itemId,
      salesOrderNumber: 'SO-2026-001',
      customerCompanyName: '한빛전자',
      dueDate: '2026-02-05',
      statusCode: 'IN_PRODUCTION',
      orderItems: [{ itemId: 'item-1001', itemName: '모터 A', quantity: 100, uomName: 'EA' }],
    });
  }),
  http.get(`${INVENTORY_BASE_PATH}/sales-orders/ready-to-ship/:itemId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load shipping detail', 500);
    return ok({
      salesOrderId: params.itemId,
      salesOrderNumber: 'SO-2026-002',
      customerCompanyName: '미래전자',
      dueDate: '2026-02-02',
      statusCode: 'READY_TO_SHIP',
      orderItems: [{ itemId: 'item-1002', itemName: '베어링 B', quantity: 50, uomName: 'EA' }],
    });
  }),
  http.patch(`${INVENTORY_BASE_PATH}/sales-orders/:orderId/status`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update shipping status', 500);
    return ok({
      salesOrderId: 'so-001',
      salesOrderCode: 'SO-2026-001',
      status: 'READY_TO_SHIP',
    });
  }),
  http.get(INVENTORY_ENDPOINTS.PENDING_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load pending list', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          purchaseOrderId: 'po-001',
          purchaseOrderNumber: 'PO-2026-001',
          supplierCompanyName: '대양상사',
          orderDate: '2026-01-10',
          dueDate: '2026-02-01',
          totalAmount: 4200000,
          statusCode: 'PENDING',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(INVENTORY_ENDPOINTS.RECEIVED_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load received list', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          purchaseOrderId: 'po-002',
          purchaseOrderNumber: 'PO-2026-002',
          supplierCompanyName: '대한금속',
          orderDate: '2026-01-05',
          dueDate: '2026-01-20',
          totalAmount: 2800000,
          statusCode: 'RECEIVED',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(INVENTORY_ENDPOINTS.ITEM_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load item toggle', 500);
    return ok([
      {
        itemId: 'item-1001',
        unitPrice: 12000,
        supplierCompanyName: '대양상사',
        uomName: 'EA',
        supplierCompanyId: 'sup-001',
        itemName: '모터 A',
      },
    ]);
  }),
  http.get(INVENTORY_ENDPOINTS.WAREHOUSE_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load warehouse toggle', 500);
    return ok({
      warehouses: [
        { warehouseId: 'wh-001', warehouseName: '1공장 창고', warehouseNumber: 'WH-001' },
      ],
    });
  }),
  http.post(INVENTORY_ENDPOINTS.ADD_MATERIALS, ({ request }) => {
    if (shouldError(request)) return error('Failed to add materials', 500);
    return okNoData();
  }),
  http.post(INVENTORY_ENDPOINTS.MATERIALS_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load materials', 500);
    return ok([
      {
        itemId: 'item-1001',
        itemName: '모터 A',
        itemNmber: 'ITM-1001',
        unitPrice: 12000,
        supplierName: '대양상사',
      },
    ]);
  }),

  // ----------------------- Warehouse -----------------------
  http.get(WAREHOUSE_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load warehouse stats', 500);
    return ok(mockWarehouseStats);
  }),
  http.get(WAREHOUSE_ENDPOINTS.WAREHOUSE_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load warehouse list', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          warehouseId: 'wh-001',
          warehouseNumber: 'WH-001',
          warehouseName: '1공장 창고',
          statusCode: 'ACTIVE',
          warehouseType: 'RAW',
          location: '서울 강서구',
          manager: '이자재',
          managerPhone: '010-2222-3333',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get(`${INVENTORY_BASE_PATH}/iv/warehouses/:warehouseId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load warehouse detail', 500);
    return ok({
      warehouseInfo: {
        warehouseName: '1공장 창고',
        warehouseNumber: 'WH-001',
        warehouseType: 'RAW',
        statusCode: 'ACTIVE',
        location: '서울 강서구',
        description: '주 원자재 보관',
      },
      manager: {
        managerId: 'mgr-001',
        managerName: '이자재',
        managerPhoneNumber: '010-2222-3333',
        managerEmail: 'manager@everp.co.kr',
      },
    });
  }),
  http.post(WAREHOUSE_ENDPOINTS.ADD_WAREHOUSE, ({ request }) => {
    if (shouldError(request)) return error('Failed to add warehouse', 500);
    return okNoData();
  }),
  http.get(WAREHOUSE_ENDPOINTS.WAREHOUSE_MANAGER_INFO, ({ request }) => {
    if (shouldError(request)) return error('Failed to load warehouse managers', 500);
    return ok([
      {
        managerEmail: 'manager@everp.co.kr',
        managerId: 'mgr-001',
        managerName: '이자재',
        managerPhone: '010-2222-3333',
      },
    ]);
  }),
  http.put(`${INVENTORY_BASE_PATH}/iv/warehouses/:warehouseId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update warehouse', 500);
    return okNoData();
  }),

  // ----------------------- Low Stock -----------------------
  http.get(LOWSTOCK_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load low stock stats', 500);
    return ok(mockLowStockStats);
  }),
  http.get(LOWSTOCK_ENDPOINTS.LOW_STOCK_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load low stock list', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    return ok({
      content: [
        {
          itemId: 'item-1002',
          itemName: '베어링 B',
          itemNumber: 'ITM-1002',
          category: 'BEARING',
          currentStock: 20,
          uomName: 'EA',
          safetyStock: 50,
          unitPrice: 8000,
          totalAmount: 160000,
          warehouseName: '1공장 창고',
          warehouseNumber: 'WH-001',
          statusCode: 'URGENT',
        },
      ],
      page: makePage(page, size, 1),
    });
  }),

  // ----------------------- Purchase -----------------------
  http.get(PURCHASE_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load purchase stats', 500);
    return ok(mockPurchaseStats);
  }),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER_ORDERS_STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier orders stats', 500);
    return ok(mockSupplierOrderStats);
  }),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_REQUISITIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load purchase requisitions', 500);
    return ok({
      content: [
        {
          purchaseRequisitionId: 'pr-001',
          purchaseRequisitionNumber: 'PR-2026-001',
          requesterId: 'emp-001',
          requesterName: '홍길동',
          departmentId: 'dept-001',
          departmentName: '구매팀',
          statusCode: 'PENDING',
          requestDate: '2026-01-10',
          totalAmount: 4200000,
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.post(PURCHASE_ENDPOINTS.PURCHASE_REQUISITIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to create purchase requisition', 500);
    return ok(null);
  }),
  http.post(PURCHASE_ENDPOINTS.STOCK_PURCHASE_REQUISITIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to create stock purchase requisition', 500);
    return ok(null);
  }),
  http.get(`${PURCHASE_BASE_PATH}/purchase-requisitions/:prId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load requisition detail', 500);
    return ok({
      id: params.prId,
      purchaseRequisitionNumber: 'PR-2026-001',
      requesterId: 'emp-001',
      requesterName: '홍길동',
      departmentId: 'dept-001',
      departmentName: '구매팀',
      requestDate: '2026-01-10',
      statusCode: 'PENDING',
      items: [
        {
          itemId: 1,
          itemName: '원자재 A',
          dueDate: '2026-02-01',
          quantity: 200,
          uomCode: 'EA',
          unitPrice: 20000,
          amount: 4000000,
        },
      ],
      totalAmount: 4200000,
    });
  }),
  http.post(`${PURCHASE_BASE_PATH}/purchase-requisitions/:prId/release`, ({ request }) => {
    if (shouldError(request)) return error('Failed to approve requisition', 500);
    return ok(null);
  }),
  http.post(`${PURCHASE_BASE_PATH}/purchase-requisitions/:prId/reject`, ({ request }) => {
    if (shouldError(request)) return error('Failed to reject requisition', 500);
    return ok(null);
  }),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_ORDERS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load purchase orders', 500);
    return ok({
      content: [
        {
          purchaseOrderId: 'po-001',
          purchaseOrderNumber: 'PO-2026-001',
          supplierName: '대양상사',
          itemsSummary: '원자재 A 외 2건',
          orderDate: '2026-01-08',
          dueDate: '2026-01-30',
          totalAmount: 4200000,
          statusCode: 'PENDING',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.post(`${PURCHASE_BASE_PATH}/purchase-orders/:poId/approve`, ({ request }) => {
    if (shouldError(request)) return error('Failed to approve purchase order', 500);
    return ok(null);
  }),
  http.post(new RegExp(`${PURCHASE_BASE_PATH}/purchase-orders/[^/]+/reject,?$`), ({ request }) => {
    if (shouldError(request)) return error('Failed to reject purchase order', 500);
    return ok(null);
  }),
  http.post(new RegExp(`${PURCHASE_BASE_PATH}/[^/]+/start-delivery`), ({ request }) => {
    if (shouldError(request)) return error('Failed to start delivery', 500);
    return ok(null);
  }),
  http.get(`${PURCHASE_BASE_PATH}/purchase-orders/:purchaseId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load purchase order detail', 500);
    return ok({
      statusCode: 'PENDING',
      dueDate: '2026-01-30',
      purchaseOrderId: params.purchaseId,
      purchaseOrderNumber: 'PO-2026-001',
      orderDate: '2026-01-08',
      supplierId: 'sup-001',
      supplierNumber: 'SUP-001',
      supplierName: '대양상사',
      managerPhone: '010-5555-6666',
      managerEmail: 'supplier@everp.co.kr',
      items: [
        {
          itemId: 'item-2001',
          itemName: '원자재 A',
          quantity: 200,
          uomName: 'EA',
          unitPrice: 20000,
          totalPrice: 4000000,
        },
      ],
      totalAmount: 4200000,
      note: '납기 준수 요청',
    });
  }),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER, ({ request }) => {
    if (shouldError(request)) return error('Failed to load suppliers', 500);
    return ok({
      content: [
        {
          statusCode: 'ACTIVE',
          supplierInfo: {
            supplierId: 'sup-001',
            supplierName: '대양상사',
            supplierNumber: 'SUP-001',
            supplierEmail: 'supplier@everp.co.kr',
            supplierPhone: '02-999-0000',
            supplierBaseAddress: '부산광역시 사상구',
            supplierDetailAddress: '2층',
            supplierStatusCode: 'ACTIVE',
            category: 'MATERIAL',
            deliveryLeadTime: 5,
          },
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get(`${PURCHASE_BASE_PATH}/supplier/:supplierId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load supplier detail', 500);
    return ok({
      supplierInfo: {
        supplierId: params.supplierId,
        supplierName: '대양상사',
        supplierNumber: 'SUP-001',
        supplierEmail: 'supplier@everp.co.kr',
        supplierPhone: '02-999-0000',
        supplierBaseAddress: '부산광역시 사상구',
        supplierDetailAddress: '2층',
        supplierStatusCode: 'ACTIVE',
        category: 'MATERIAL',
        deliveryLeadTime: 5,
      },
      managerInfo: {
        managerName: '정공급',
        managerPhone: '010-9999-0000',
        managerEmail: 'manager@supplier.co.kr',
      },
    });
  }),
  http.post(PURCHASE_ENDPOINTS.SUPPLIER, ({ request }) => {
    if (shouldError(request)) return error('Failed to create supplier', 500);
    return ok(null);
  }),
  http.patch(`${PURCHASE_BASE_PATH}/supplier/:supplierId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update supplier', 500);
    return ok(null);
  }),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_REQUISITION_STATUS_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load PR status dropdown', 500);
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'APPROVED', value: '승인' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_REQUISITION_SEARCH_TYPE_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load PR search type dropdown', 500);
    return ok([
      { key: 'NUMBER', value: '요청 번호' },
      { key: 'REQUESTER', value: '요청자' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_ORDER_STATUS_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load PO status dropdown', 500);
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'APPROVED', value: '승인' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_ORDER_SEARCH_TYPE_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load PO search type dropdown', 500);
    return ok([
      { key: 'NUMBER', value: '발주 번호' },
      { key: 'SUPPLIER', value: '공급업체' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER_CATEGORY_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier category dropdown', 500);
    return ok([
      { key: 'MATERIAL', value: '자재' },
      { key: 'SERVICE', value: '서비스' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER_SEARCH_TYPE_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier search dropdown', 500);
    return ok([
      { key: 'NAME', value: '공급업체명' },
      { key: 'NUMBER', value: '공급업체 코드' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER_STATUS_TOGGLE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier status dropdown', 500);
    return ok([
      { key: 'ACTIVE', value: '활성' },
      { key: 'INACTIVE', value: '비활성' },
    ]);
  }),

  // ----------------------- Production -----------------------
  http.get(PRODUCTION_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load production stats', 500);
    return ok(mockProductionStats);
  }),
  http.get(PRODUCTION_ENDPOINTS.QUOTATIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load quotations', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const filterStatus = url.searchParams.get('statusCode') ?? '';
    const filterAvailable = url.searchParams.get('availableStatusCode') ?? '';
    const filterStartDate = url.searchParams.get('startDate') ?? '';
    const filterEndDate = url.searchParams.get('endDate') ?? '';
    const customers = [
      '한빛전자',
      '대양상사',
      '삼성전자',
      '현대모비스',
      '두산중공업',
      'LG화학',
      '포스코',
      'SK하이닉스',
      '론데케미칼',
      'KT&G',
    ];
    const statusCodes = ['NEW', 'CONFIRMED'];
    const availableStatuses = ['CHECKED', 'UNCHECKED'];
    const baseTotal = 512;
    const allData = Array.from({ length: baseTotal }, (_, i) => {
      const idx = i + 1;
      const year = 2025 + Math.floor(idx / 300);
      const month = String((idx % 12) + 1).padStart(2, '0');
      const day = String((idx % 28) + 1).padStart(2, '0');
      const nextMonth = String((Number(month) % 12) + 1).padStart(2, '0');
      return {
        quotationId: `qt-${String(idx).padStart(3, '0')}`,
        quotationNumber: `QT-${year}-${String(idx).padStart(3, '0')}`,
        customerName: customers[idx % customers.length],
        requestDate: `${year}-${month}-${day}`,
        dueDate: `${year}-${nextMonth}-${day}`,
        statusCode: statusCodes[idx % statusCodes.length],
        availableStatus: availableStatuses[idx % availableStatuses.length],
      };
    });
    let filtered = allData;
    if (filterStatus && filterStatus !== 'ALL')
      filtered = filtered.filter((d) => d.statusCode === filterStatus);
    if (filterAvailable && filterAvailable !== 'ALL')
      filtered = filtered.filter((d) => d.availableStatus === filterAvailable);
    if (filterStartDate) filtered = filtered.filter((d) => d.requestDate >= filterStartDate);
    if (filterEndDate) filtered = filtered.filter((d) => d.requestDate <= filterEndDate);
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.post(PRODUCTION_ENDPOINTS.QUOTATION_SIMULATE, ({ request }) => {
    if (shouldError(request)) return error('Failed to simulate quotation', 500);
    return ok({
      page: makePage(0, 10, 1),
      content: [
        {
          quotationId: 'qt-001',
          quotationNumber: 'QT-2026-001',
          customerCompanyId: 'cus-001',
          customerCompanyName: '한빛전자',
          productId: 'prod-001',
          productName: '모터 A',
          requestQuantity: 100,
          requestDueDate: 20260201,
          simulation: {
            status: 'OK',
            availableQuantity: 120,
            shortageQuantity: 0,
            suggestedDueDate: '2026-02-01',
            generatedAt: isoNow,
          },
          shortages: [],
        },
      ],
    });
  }),
  http.post(PRODUCTION_ENDPOINTS.QUOTATION_PREVIEW, ({ request }) => {
    if (shouldError(request)) return error('Failed to preview quotation', 500);
    return ok([
      {
        quotationNumber: 'QT-2026-001',
        customerCompanyName: '한빛전자',
        productName: '모터 A',
        confirmedDueDate: '2026-02-01',
        weeks: [
          {
            week: '2026-01-1W',
            demand: 100,
            requiredQuantity: 100,
            productionQuantity: 100,
            mps: 100,
          },
        ],
      },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MPS_PLANS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MPS', 500);
    return ok({
      bomId: 'bom-001',
      productName: '모터 A',
      content: [
        {
          week: '2026-01-1W',
          demand: 100,
          requiredInventory: 20,
          productionNeeded: 80,
          plannedProduction: 90,
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.post(PRODUCTION_ENDPOINTS.QUOTATION_CONFIRM, ({ request }) => {
    if (shouldError(request)) return error('Failed to confirm quotation', 500);
    return ok(null);
  }),
  http.get(PRODUCTION_ENDPOINTS.BOMS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load BOM list', 500);
    return ok({
      page: makePage(0, 10, 1),
      content: [
        {
          bomId: 'bom-001',
          bomNumber: 'BOM-2026-001',
          productId: 'prod-001',
          productNumber: 'PRD-001',
          productName: '모터 A',
          version: 'v1',
          statusCode: '활성',
          lastModifiedAt: isoNow,
        },
      ],
    });
  }),
  http.get(`${PRODUCTION_BASE_PATH}/products/:productId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load product detail', 500);
    return ok({
      productId: params.productId,
      productName: '모터 A',
      category: 'MOTOR',
      productNumber: 'PRD-001',
      uomName: 'EA',
      unitPrice: 12000,
      supplierName: '대양상사',
    });
  }),
  http.get(PRODUCTION_ENDPOINTS.OPERATIONS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load operations', 500);
    return ok([
      { key: 'OP10', value: '절삭' },
      { key: 'OP20', value: '조립' },
    ]);
  }),
  http.get(`${PRODUCTION_BASE_PATH}/boms/:bomId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load BOM detail', 500);
    const bomId = params.bomId as string;
    return ok({
      bomId,
      bomNumber: 'BOM-2026-001',
      productId: 'prod-001',
      productNumber: 'PRD-001',
      productName: '모터 A',
      version: getBomVersion(bomId), // 서버 현재 버전을 동적으로 반환
      statusCode: '활성',
      lastModifiedAt: isoNow,
      components: [
        {
          itemId: 'item-1001',
          code: 'ITM-1001',
          name: '베어링 B',
          quantity: 2,
          unit: 'EA',
          level: 'Level 1',
          supplierName: '대한금속',
          operationId: 'OP10',
          operationName: '절삭',
          componentType: '부품',
        },
      ],
      levelStructure: [
        {
          id: 'node-1',
          code: 'ITM-1001',
          name: '베어링 B',
          quantity: 2,
          unit: 'EA',
          level: 1,
          parentId: null,
        },
      ],
      routing: [
        {
          itemName: '모터 A',
          sequence: 1,
          operationName: '절삭',
          runTime: 30,
        },
      ],
    });
  }),
  // BOM 상태 수정 요청 — 낙관적 락 버전 검증
  http.patch(`${PRODUCTION_BASE_PATH}/boms/:bomId`, async ({ request, params }) => {
    if (shouldError(request)) return error('Failed to update BOM', 500);
    const bomId = params.bomId as string;
    const body = (await request.json()) as { version: string; statusCode?: string };
    const serverVersion = getBomVersion(bomId);

    // 클라이언트가 보낸 version이 서버 version과 다르면 409 반환
    // → 다른 사용자가 먼저 수정한 상황을 의미
    if (body.version !== serverVersion) {
      return HttpResponse.json(
        {
          status: 409,
          success: false,
          message: `다른 사용자가 이미 이 BOM을 수정했습니다. (서버: ${serverVersion} / 요청: ${body.version})`,
        },
        { status: 409 },
      );
    }

    // 버전 일치 → 수정 성공, 서버 버전 증가
    const newVersion = bumpBomVersion(bomId);
    return HttpResponse.json({
      status: 200,
      success: true,
      message: `BOM이 수정되었습니다. (버전: ${newVersion})`,
    });
  }),
  // [개발 테스트 전용] 서버 버전을 강제로 올려서 충돌 상황 시뮬레이션
  // 이 엔드포인트를 호출하면 "다른 사용자가 먼저 수정했다"는 시나리오가 됨
  http.post(`${PRODUCTION_BASE_PATH}/boms/:bomId/simulate-conflict`, ({ params }) => {
    const bomId = params.bomId as string;
    const newVersion = bumpBomVersion(bomId);
    return HttpResponse.json({
      message: `[테스트] 서버 버전이 ${newVersion}로 변경되었습니다. 다음 수정 요청은 409를 반환합니다.`,
    });
  }),
  http.post(PRODUCTION_ENDPOINTS.BOMS, ({ request }) => {
    if (shouldError(request)) return error('Failed to create BOM', 500);
    return okNoData();
  }),
  http.delete(`${PRODUCTION_BASE_PATH}/boms/:bomId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to delete BOM', 500);
    return okNoData();
  }),
  http.get(PRODUCTION_ENDPOINTS.MRP_ORDERS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP orders', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const filterQuotation = url.searchParams.get('quotationId') ?? '';
    const filterAvailable = url.searchParams.get('availableStatusCode') ?? '';
    const itemNames = [
      '베어링 B',
      '스프링 C',
      '볼트 M10',
      '너트 M10',
      '기어 A',
      '샤프트 D',
      '플랜지 E',
      '커플링 F',
      '실린더 G',
      '피스톤 H',
    ];
    const suppliers = [
      '대한금속',
      '현대파스너',
      '하나금속',
      '삼성부품',
      '두산소재',
      'LG부품',
      '포스코재료',
      'SK소재',
      '론데금속',
      'KT부품',
    ];
    const itemTypes = ['MATERIAL', 'PRODUCT'];
    const convertStatuses = ['NOT_CONVERTED', 'CONVERTED', 'PENDING'];
    const baseTotal = 500;
    const allData = Array.from({ length: baseTotal }, (_, i) => {
      const idx = i + 1;
      const year = 2025 + Math.floor(idx / 300);
      const month = String((idx % 12) + 1).padStart(2, '0');
      const day = String((idx % 28) + 1).padStart(2, '0');
      const nextMonth = String((Number(month) % 12) + 1).padStart(2, '0');
      const requiredQty = ((idx % 50) + 1) * 10;
      const availableStock = (idx % 30) * 5;
      const consumptionQty = Math.min(availableStock, requiredQty);
      const shortageQty = Math.max(0, requiredQty - availableStock);
      return {
        quotationId: `qt-${String((idx % 10) + 1).padStart(3, '0')}`,
        itemId: `item-${1000 + idx}`,
        itemName: itemNames[idx % itemNames.length],
        requiredQuantity: requiredQty,
        currentStock: availableStock + (idx % 10),
        reservedStock: idx % 5,
        actualAvailableStock: availableStock,
        safetyStock: 30,
        availableStock,
        availableStatusCode: shortageQty > 0 ? 'INSUFFICIENT' : 'SUFFICIENT',
        shortageQuantity: shortageQty,
        consumptionQuantity: consumptionQty,
        itemType: itemTypes[idx % itemTypes.length],
        procurementStartDate: `${year}-${month}-${day}`,
        expectedArrivalDate: `${year}-${nextMonth}-${day}`,
        supplierCompanyName: suppliers[idx % suppliers.length],
        convertStatus: convertStatuses[idx % convertStatuses.length],
      };
    });
    let filtered = allData;
    if (filterQuotation && filterQuotation !== 'ALL')
      filtered = filtered.filter((d) => d.quotationId === filterQuotation);
    if (filterAvailable && filterAvailable !== 'ALL')
      filtered = filtered.filter((d) => d.availableStatusCode === filterAvailable);
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.post(PRODUCTION_ENDPOINTS.MRP_CONVERT, ({ request }) => {
    if (shouldError(request)) return error('Failed to convert MRP orders', 500);
    return ok({ converted: true });
  }),
  http.get(PRODUCTION_ENDPOINTS.MRP_PLANNED_ORDERS_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP planned orders', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const filterStatus = url.searchParams.get('status') ?? '';
    const filterQuotation = url.searchParams.get('quotationId') ?? '';
    const itemNames = [
      '베어링 B',
      '스프링 C',
      '볼트 M10',
      '너트 M10',
      '기어 A',
      '샤프트 D',
      '플랜지 E',
      '커플링 F',
      '실린더 G',
      '피스톤 H',
    ];
    const statuses = ['PENDING', 'PLANNED', 'APPROVED', 'REJECTED'];
    const baseTotal = 500;
    const allData = Array.from({ length: baseTotal }, (_, i) => {
      const idx = i + 1;
      const year = 2025 + Math.floor(idx / 300);
      const month = String((idx % 12) + 1).padStart(2, '0');
      const day = String((idx % 28) + 1).padStart(2, '0');
      const nextMonth = String((Number(month) % 12) + 1).padStart(2, '0');
      return {
        mrpRunId: `mrp-${String(idx).padStart(3, '0')}`,
        quotationNumber: `QT-${year}-${String((idx % 20) + 1).padStart(3, '0')}`,
        itemId: `item-${1000 + idx}`,
        itemName: itemNames[idx % itemNames.length],
        quantity: ((idx % 50) + 1) * 10,
        status: statuses[idx % statuses.length],
        procurementStartDate: `${year}-${month}-${day}`,
        expectedArrivalDate: `${year}-${nextMonth}-${day}`,
      };
    });
    let filtered = allData;
    if (filterStatus && filterStatus !== 'ALL')
      filtered = filtered.filter((d) => d.status === filterStatus);
    if (filterQuotation && filterQuotation !== 'ALL')
      filtered = filtered.filter((d) => d.quotationNumber.includes(filterQuotation));
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.get(`${PRODUCTION_BASE_PATH}/mrp/planned-orders/detail/:mrpId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load MRP planned order detail', 500);
    return ok({
      mrpId: params.mrpId,
      quotationId: 'qt-001',
      quotationCode: 'QT-2026-001',
      requesterId: 'emp-001',
      requesterName: '홍길동',
      departmentName: '구매팀',
      requestDate: '2026-01-10',
      desiredDueDate: '2026-02-01',
      status: 'PLANNED',
      orderItems: [
        {
          itemId: 'item-1001',
          itemName: '베어링 B',
          quantity: 100,
          uomName: 'EA',
          unitPrice: 8000,
        },
      ],
      totalAmount: 800000,
    });
  }),
  http.get(PRODUCTION_ENDPOINTS.MES_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MES list', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const filterStatus = url.searchParams.get('status') ?? '';
    const filterQuotation = url.searchParams.get('quotationId') ?? '';
    const productNames = ['모터 A', '펌프 B', '밸브 C', '센서 D', '컨베이어 E'];
    const quotationNumbers = [
      'QT-2026-001',
      'QT-2026-002',
      'QT-2026-003',
      'QT-2026-004',
      'QT-2026-005',
    ];
    const quotationIds = ['qt-001', 'qt-002', 'qt-003', 'qt-004', 'qt-005'];
    const statuses = ['WAITING', 'IN_PROGRESS', 'WAITING', 'IN_PROGRESS', 'WAITING'];
    const baseTotal = 50;
    const allData = Array.from({ length: baseTotal }, (_, i) => {
      const idx = i + 1;
      const statusIdx = idx % statuses.length;
      const qIdx = idx % quotationIds.length;
      const progress = statuses[statusIdx] === 'IN_PROGRESS' ? 20 + (idx % 70) : 0;
      return {
        mesId: `mes-${String(idx).padStart(3, '0')}`,
        mesNumber: `MES-2026-${String(idx).padStart(3, '0')}`,
        productId: `prod-${String((idx % 5) + 1).padStart(3, '0')}`,
        productName: productNames[idx % productNames.length],
        quantity: ((idx % 10) + 1) * 50,
        uomName: 'EA',
        quotationId: quotationIds[qIdx],
        quotationNumber: quotationNumbers[qIdx],
        status: statuses[statusIdx],
        currentOperation: statuses[statusIdx] === 'IN_PROGRESS' ? 2 : 1,
        startDate: `2026-0${(idx % 3) + 1}-${String((idx % 28) + 1).padStart(2, '0')}`,
        endDate: `2026-0${(idx % 3) + 2}-${String((idx % 28) + 1).padStart(2, '0')}`,
        progressRate: progress,
        sequence: ['OP10', 'OP20', 'OP30'],
      };
    });
    let filtered = allData;
    if (filterStatus && filterStatus !== 'ALL')
      filtered = filtered.filter((d) => d.status === filterStatus);
    if (filterQuotation && filterQuotation !== 'ALL')
      filtered = filtered.filter((d) => d.quotationId === filterQuotation);
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.get(`${PRODUCTION_BASE_PATH}/mes/:mesId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load MES detail', 500);
    return ok({
      mesId: params.mesId,
      mesNumber: 'MES-2026-001',
      productId: 'prod-001',
      productName: '모터 A',
      quantity: 100,
      uomName: 'EA',
      progressPercent: 60,
      statusCode: 'IN_PROGRESS',
      plan: { startDate: '2026-01-15', dueDate: '2026-02-01' },
      currentOperation: 'OP20',
      operations: [
        {
          mesOperationLogId: 'op-001',
          operationNumber: 'OP10',
          operationName: '절삭',
          sequence: 1,
          statusCode: 'COMPLETED',
          startedAt: isoNow,
          finishedAt: isoNow,
          durationHours: 2,
          manager: { id: 1, name: '박공정' },
          canStart: false,
          canComplete: false,
        },
        {
          mesOperationLogId: 'op-002',
          operationNumber: 'OP20',
          operationName: '조립',
          sequence: 2,
          statusCode: 'IN_PROGRESS',
          startedAt: isoNow,
          finishedAt: '',
          durationHours: 0,
          manager: { id: 2, name: '정공정' },
          canStart: false,
          canComplete: true,
        },
      ],
      canStartMes: false,
      canCompleteMes: false,
    });
  }),
  http.put(`${PRODUCTION_BASE_PATH}/mes/:mesId/start`, ({ request }) => {
    if (shouldError(request)) return error('Failed to start MES', 500);
    return okNoData();
  }),
  http.put(`${PRODUCTION_BASE_PATH}/mes/:mesId/complete`, ({ request }) => {
    if (shouldError(request)) return error('Failed to complete MES', 500);
    return okNoData();
  }),
  http.put(`${PRODUCTION_BASE_PATH}/mes/:mesId/operations/:operationId/start`, ({ request }) => {
    if (shouldError(request)) return error('Failed to start operation', 500);
    return okNoData();
  }),
  http.put(`${PRODUCTION_BASE_PATH}/mes/:mesId/operations/:operationId/complete`, ({ request }) => {
    if (shouldError(request)) return error('Failed to complete operation', 500);
    return okNoData();
  }),
  http.get(PRODUCTION_ENDPOINTS.MPS_TOGGLE_PRODUCTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MPS dropdown', 500);
    return ok([
      { key: 'bom-001', value: '모터 A' },
      { key: 'bom-002', value: '펌프 B' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.PRODUCTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load products', 500);
    return ok([
      { key: 'prod-001', value: '모터 A' },
      { key: 'prod-002', value: '펌프 B' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.AVAILABLE_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load available status dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 가용재고' },
      { key: 'CHECKED', value: '확인' },
      { key: 'UNCHECKED', value: '미확인' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.QUOTATION_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load quotation status dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'NEW', value: '신규' },
      { key: 'CONFIRMED', value: '확정' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MRP_QUOTATION_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP quotations dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 견적' },
      { key: 'qt-001', value: 'QT-2026-001' },
      { key: 'qt-002', value: 'QT-2026-002' },
      { key: 'qt-003', value: 'QT-2026-003' },
      { key: 'qt-004', value: 'QT-2026-004' },
      { key: 'qt-005', value: 'QT-2026-005' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MRP_AVAILABLE_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP available status dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'SUFFICIENT', value: '충분' },
      { key: 'INSUFFICIENT', value: '부족' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MRP_RUNS_QUOTATIONS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP runs quotations dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 견적' },
      { key: 'qt-001', value: 'QT-2026-001' },
      { key: 'qt-002', value: 'QT-2026-002' },
      { key: 'qt-003', value: 'QT-2026-003' },
      { key: 'qt-004', value: 'QT-2026-004' },
      { key: 'qt-005', value: 'QT-2026-005' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MRP_RUNS_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP runs status dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'PENDING', value: '대기' },
      { key: 'PLANNED', value: '계획' },
      { key: 'APPROVED', value: '승인' },
      { key: 'REJECTED', value: '반려' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MES_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MES status dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'WAITING', value: '대기' },
      { key: 'IN_PROGRESS', value: '진행중' },
    ]);
  }),

  // ----------------------- HRM -----------------------
  http.get(HRM_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load HRM stats', 500);
    return ok(mockHrmStats);
  }),
  http.get(HRM_ENDPOINTS.EMPLOYEE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load employees', 500);
    return ok({
      content: [
        {
          employeeId: 'emp-001',
          employeeNumber: 'EMP-2026-001',
          name: '홍길동',
          email: 'user@everp.co.kr',
          phone: '010-1234-5678',
          position: '팀장',
          department: '영업팀',
          statusCode: 'ACTIVE',
          hireDate: '2022-03-01',
          birthDate: '1990-01-01',
          address: '서울특별시 강남구',
          createdAt: isoNow,
          updatedAt: isoNow,
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get(HRM_ENDPOINTS.POSITIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load positions', 500);
    return ok([
      {
        positionId: 'pos-001',
        positionName: '팀장',
        headCount: 4,
        payment: 5000000,
      },
    ]);
  }),
  http.get(`${HRM_BASE_PATH}/positions/:positionId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load position detail', 500);
    return ok({
      positionId: params.positionId,
      positionName: '팀장',
      headCount: 4,
      payment: 5000000,
      employees: [
        {
          employeeId: 'emp-001',
          employeeCode: 'EMP-2026-001',
          employeeName: '홍길동',
          positionId: params.positionId,
          position: '팀장',
          departmentId: 'dept-001',
          department: '영업팀',
          hireDate: '2022-03-01',
        },
      ],
    });
  }),
  http.get(HRM_ENDPOINTS.DEPARTMENTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load departments', 500);
    return ok({
      content: [
        {
          departmentId: 'dept-001',
          departmentNumber: 'D-001',
          departmentName: '영업팀',
          description: 'B2B 영업',
          managerName: '홍길동',
          managerId: 'emp-001',
          location: '서울 강남',
          statusCode: 'ACTIVE',
          employeeCount: 8,
          establishedDate: '2020-01-01',
          employees: [
            {
              employeeId: 'emp-001',
              employeeName: '홍길동',
              position: '팀장',
              hireDate: '2022-03-01',
            },
          ],
        },
      ],
    });
  }),
  http.patch(`${HRM_BASE_PATH}/departments/:departmentId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update department', 500);
    return ok(null);
  }),
  http.get(HRM_ENDPOINTS.PAYROLL, ({ request }) => {
    if (shouldError(request)) return error('Failed to load payroll list', 500);
    return ok({
      content: [
        {
          payrollId: 'pay-001',
          employee: {
            employeeId: 'emp-001',
            employeeName: '홍길동',
            departmentId: 'dept-001',
            department: '영업팀',
            positionId: 'pos-001',
            position: '팀장',
          },
          pay: {
            basePay: 3000000,
            overtimePay: 200000,
            deduction: 150000,
            netPay: 3050000,
            statusCode: 'PENDING',
          },
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get(`${HRM_BASE_PATH}/payroll/:payrollId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load payroll detail', 500);
    return ok({
      payrollId: params.payrollId,
      employee: {
        employeeId: 'emp-001',
        employeeName: '홍길동',
        departmentId: 'dept-001',
        department: '영업팀',
        positionId: 'pos-001',
        position: '팀장',
      },
      pay: {
        basePay: 3000000,
        basePayItem: [{ itemContent: '기본급', itemSum: 3000000 }],
        overtimePay: 200000,
        overtimePayItem: [{ itemContent: '연장근무', itemSum: 200000 }],
        deduction: 150000,
        deductionItem: [{ itemContent: '세금', itemSum: 150000 }],
        netPay: 3050000,
      },
      statusCode: 'PENDING',
      expectedDate: '2026-01-25',
    });
  }),
  http.get(HRM_ENDPOINTS.TRAINING_STATUS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load training list', 500);
    return ok({
      items: [
        {
          employeeId: 'emp-001',
          name: '홍길동',
          department: '영업팀',
          position: '팀장',
          completedCount: 2,
          inProgressCount: 1,
          requiredMissingCount: 0,
          lastTrainingDate: '2026-01-05',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get(`${HRM_BASE_PATH}/training/employee/:employeeId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load training detail', 500);
    return ok({
      employeeId: params.employeeId,
      employeeName: '홍길동',
      department: '영업팀',
      position: '팀장',
      completedCount: 2,
      requiredMissingCount: 0,
      lastTrainingDate: '2026-01-05',
      programHistory: [
        {
          programId: 'prog-001',
          programName: '안전 교육',
          programStatus: 'COMPLETED',
          completedAt: '2026-01-05',
        },
      ],
    });
  }),
  http.get(HRM_ENDPOINTS.PROGRAM, ({ request }) => {
    if (shouldError(request)) return error('Failed to load program list', 500);
    return ok({
      content: [
        {
          programId: 'prog-001',
          programName: '안전 교육',
          statusCode: 'ACTIVE',
          category: 'SAFETY',
          trainingHour: 4,
          isOnline: true,
          capacity: 30,
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get(`${HRM_BASE_PATH}/program/:programId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load program detail', 500);
    return ok({
      programId: params.programId,
      programName: '안전 교육',
      statusCode: 'ACTIVE',
      category: 'SAFETY',
      trainingHour: 4,
      isOnline: true,
      startDate: '2026-02-01',
      designatedEmployee: [
        {
          employeeId: 'emp-001',
          employeeName: '홍길동',
          department: '영업팀',
          position: '팀장',
          statusCode: 'PENDING',
          completedAt: null,
        },
      ],
      number: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
  }),
  http.get(HRM_ENDPOINTS.TIME_RECORD, ({ request }) => {
    if (shouldError(request)) return error('Failed to load attendance list', 500);
    return ok({
      content: [
        {
          timerecordId: 'time-001',
          employee: {
            employeeId: 'emp-001',
            employeeName: '홍길동',
            departmentId: 'dept-001',
            department: '영업팀',
            positionId: 'pos-001',
            position: '팀장',
          },
          workDate: '2026-01-28',
          checkInTime: '2026-01-28T09:00:00',
          checkOutTime: '2026-01-28T18:00:00',
          totalWorkMinutes: 540,
          overtimeMinutes: 30,
          statusCode: 'ON_TIME',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get(HRM_ENDPOINTS.LEAVE_REQUESTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load leave list', 500);
    return ok({
      content: [
        {
          leaveRequestId: 'leave-001',
          employee: {
            employeeId: 'emp-001',
            employeeName: '홍길동',
            department: '영업팀',
            position: '팀장',
          },
          leaveType: 'ANNUAL',
          startDate: '2026-02-05',
          endDate: '2026-02-06',
          numberOfLeaveDays: 2,
          remainingLeaveDays: 8,
          status: 'PENDING',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.patch(`${HRM_BASE_PATH}/employee/:employeeId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update employee', 500);
    return okNoData();
  }),
  http.patch(`${HRM_BASE_PATH}/leave/request/:requestId/release`, ({ request }) => {
    if (shouldError(request)) return error('Failed to approve leave', 500);
    return ok(null);
  }),
  http.patch(`${HRM_BASE_PATH}/leave/request/:requestId/reject`, ({ request }) => {
    if (shouldError(request)) return error('Failed to reject leave', 500);
    return ok(null);
  }),
  http.post(HRM_ENDPOINTS.PROGRAM, ({ request }) => {
    if (shouldError(request)) return error('Failed to create program', 500);
    return ok(null);
  }),
  http.patch(`${HRM_BASE_PATH}/program/:programId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update program', 500);
    return ok(null);
  }),
  http.post(`${HRM_BASE_PATH}/program/:employeeId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to assign program', 500);
    return ok(null);
  }),
  http.put(`${HRM_BASE_PATH}/time-record/:timerecordId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update time record', 500);
    return ok(null);
  }),
  http.post(HRM_ENDPOINTS.PAYROLL_COMPLETE, ({ request }) => {
    if (shouldError(request)) return error('Failed to complete payroll', 500);
    return ok(null);
  }),
  http.post(HRM_ENDPOINTS.EMPLOYEE_SIGNUP, ({ request }) => {
    if (shouldError(request)) return error('Failed to register employee', 500);
    return ok(null);
  }),
  http.get(HRM_ENDPOINTS.DEPARTMENTS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load departments dropdown', 500);
    return ok([
      { key: 'dept-001', value: '영업팀' },
      { key: 'dept-002', value: '구매팀' },
    ]);
  }),
  http.get(`${HRM_BASE_PATH}/:departmentId/positions/all`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load positions dropdown', 500);
    return ok([
      { key: 'pos-001', value: '팀장' },
      { key: 'pos-002', value: '사원' },
    ]);
  }),
  http.get(HRM_ENDPOINTS.ATTENDANCE_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load attendance status dropdown', 500);
    return ok([
      { key: 'ON_TIME', value: '정상' },
      { key: 'LATE', value: '지각' },
    ]);
  }),
  http.get(`${HRM_BASE_PATH}/departments/:departmentId/members`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load dept members dropdown', 500);
    return ok([{ key: 'emp-001', value: '홍길동' }]);
  }),
  http.get(HRM_ENDPOINTS.PAYROLL_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load payroll status dropdown', 500);
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'PAID', value: '지급완료' },
    ]);
  }),
  http.get(HRM_ENDPOINTS.TRAINING_CATE_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load training categories dropdown', 500);
    return ok([
      { key: 'SAFETY', value: '안전' },
      { key: 'SKILL', value: '기술' },
    ]);
  }),
  http.get(HRM_ENDPOINTS.PROGRAM_LIST_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load program dropdown', 500);
    return ok([{ key: 'prog-001', value: '안전 교육' }]);
  }),
  http.get(HRM_ENDPOINTS.PROGRAM_COMPLETION_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load program completion dropdown', 500);
    return ok([
      { key: 'COMPLETED', value: '완료' },
      { key: 'INCOMPLETED', value: '미완료' },
    ]);
  }),

  // ----------------------- Profile -----------------------
  http.post(PROFILE_ENDPOINTS.VACATION, ({ request }) => {
    if (shouldError(request)) return error('Failed to request vacation', 500);
    return okNoData();
  }),
  http.post(new RegExp(`${PROFILE_BASE_PATH}/trainings/request`), ({ request }) => {
    if (shouldError(request)) return error('Failed to register training', 500);
    return okNoData();
  }),
  http.patch(PROFILE_ENDPOINTS.CHECK_IN, ({ request }) => {
    if (shouldError(request)) return error('Failed to check in', 500);
    return okNoData();
  }),
  http.patch(PROFILE_ENDPOINTS.CHECK_OUT, ({ request }) => {
    if (shouldError(request)) return error('Failed to check out', 500);
    return okNoData();
  }),
  http.get(PROFILE_ENDPOINTS.PROFILE_INFO, ({ request }) => {
    if (shouldError(request)) return error('Failed to load profile info', 500);
    return ok(mockProfileInfo);
  }),
  http.get(PROFILE_ENDPOINTS.TODAY_ATTENDANCE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load today attendance', 500);
    return ok({
      checkInTime: '09:00',
      checkOutTime: '18:00',
      workHours: '8h',
      status: 'ON_TIME',
    });
  }),
  http.get(PROFILE_ENDPOINTS.ATTENDANCE_RECORDS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load attendance records', 500);
    return ok([
      {
        date: '2026-01-28',
        status: 'ON_TIME',
        startTime: '09:00',
        endTime: '18:00',
        workHours: '8h',
      },
    ]);
  }),
  http.get(PROFILE_ENDPOINTS.AVAILABLE_TRAINING, ({ request }) => {
    if (shouldError(request)) return error('Failed to load available training', 500);
    return ok([
      {
        trainingId: 'tr-001',
        trainingName: '안전 교육',
        trainingStatus: 'AVAILABLE',
        durationHours: 4,
        delieveryMethod: 'ONLINE',
        completionStatus: 'INCOMPLETED',
        category: 'SAFETY',
        description: '기본 안전 교육',
        complementationDate: '',
      },
    ]);
  }),
  http.get(PROFILE_ENDPOINTS.PROGRESS_TRAINING, ({ request }) => {
    if (shouldError(request)) return error('Failed to load progress training', 500);
    return ok([
      {
        trainingId: 'tr-002',
        trainingName: '품질 교육',
        trainingStatus: 'IN_PROGRESS',
        durationHours: 3,
        delieveryMethod: 'OFFLINE',
        completionStatus: 'INCOMPLETED',
        category: 'QUALITY',
        description: '품질 기준 교육',
        complementationDate: '',
      },
    ]);
  }),
  http.get(PROFILE_ENDPOINTS.COMPLETED_TRAINING, ({ request }) => {
    if (shouldError(request)) return error('Failed to load completed training', 500);
    return ok([
      {
        trainingId: 'tr-003',
        trainingName: 'ERP 사용법',
        trainingStatus: 'COMPLETED',
        durationHours: 2,
        delieveryMethod: 'ONLINE',
        completionStatus: 'COMPLETED',
        category: 'SYSTEM',
        description: 'ERP 기본 사용법',
        complementationDate: '2026-01-05',
      },
    ]);
  }),
  http.post(PROFILE_ENDPOINTS.EDIT_PROFILE, ({ request }) => {
    if (shouldError(request)) return error('Failed to update profile', 500);
    return okNoData();
  }),
];
