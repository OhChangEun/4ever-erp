import { http } from 'msw';
import { FINANCE_BASE_PATH, FINANCE_ENDPOINTS } from '@/app/types/api';
import { ok, okNoData, error, shouldError, makePage, stat, statResponse } from './utils';

const mockFinanceStats = statResponse({
  total_purchases: stat,
  net_profit: stat,
  total_sales: stat,
});

const mockCustomerSupplierStats = statResponse({
  total_amount: stat,
});

export const financeHandlers = [
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
];
