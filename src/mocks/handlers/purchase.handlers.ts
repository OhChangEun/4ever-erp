import { http } from 'msw';
import {
  PURCHASE_BASE_PATH,
  PURCHASE_ENDPOINTS,
} from '@/app/(private)/purchase/api/purchase.endpoints';
import { ok, error, shouldError, makePage, stat, statResponse } from './utils';

const mockPurchaseStats = statResponse({
  purchaseOrderAmount: stat,
  purchaseRequestCount: stat,
});

const mockSupplierOrderStats = statResponse({
  orderCount: stat,
});

export const purchaseHandlers = [
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
];
