import { http, type PathParams } from 'msw';
import {
  PURCHASE_BASE_PATH,
  PURCHASE_ENDPOINTS,
} from '@/app/(private)/purchase/api/purchase.endpoints';
import { toDateKey } from '@/app/utils/date';
import type { Schema } from '@/lib/api/contract';
import { addCreated, mockState } from '../state';
import { ok, error, shouldError, pathSegment, makePage, stat, statResponse } from './utils';

type Requisition = Schema<'PurchaseRequestListItem'>;
// 수정과 등록 본문은 상태와 분류를 글자로 보낸다. 목은 받은 값을 그대로 돌려주므로 enum 으로 좁히지 않는다
type SupplierInfo = Omit<Schema<'SupplierInfo'>, 'supplierStatusCode' | 'category'> & {
  supplierStatusCode: string;
  category: string;
};
type SupplierEdit = Schema<'UpdateSupplierBody'>;
type ManagerInfo = Schema<'ManagerInfo'>;

/**
 * 구매 목이 기억하는 쓰기 결과(로그인별, `src/mocks/state.ts`).
 * 처리 뒤 상태 값은 전부 verified=false 다. 게이트웨이는 구매 응답을 `ResponseEntity<Object>` 로 넘겨 타입이 있는 근거가 없다.
 * 구매 요청 APPROVAL, REJECTED: 목록 요청의 파라미터 설명(MmController.java:228)에 나오는 값. 응답 필드 근거는 아니다.
 * 발주서 APPROVAL, REJECTED, DELIVERING: FE 가 쓴 계약 enum 과 화면이 비교하는 값(APPROVAL 이면 배송 시작 버튼). 서버 근거 없음.
 * 이미 처리된 건에 또 보내도 성공으로 답한다(실서버 동작 미확인)
 */
export const purchaseState = mockState<{
  requisitionStatus: Map<string, string>;
  createdRequisitions: Requisition[];
  orderStatus: Map<string, Schema<'PurchaseOrderListItem'>['statusCode']>;
  createdSuppliers: Array<{ supplierInfo: SupplierInfo; managerInfo: ManagerInfo }>;
  supplierEdits: Map<string, SupplierEdit>;
  /** 자재 구매 요청이 들어간 계획 주문(mrpRunId). 생산 목의 계획 주문 목록이 읽는다 */
  requestedMrpRuns: Set<string>;
}>(() => ({
  requisitionStatus: new Map(),
  createdRequisitions: [],
  orderStatus: new Map(),
  createdSuppliers: [],
  supplierEdits: new Map(),
  requestedMrpRuns: new Set(),
}));
type PurchaseState = ReturnType<typeof purchaseState>;

const SEED_REQUISITION: Requisition = {
  purchaseRequisitionId: 'pr-001',
  purchaseRequisitionNumber: 'PR-2026-001',
  requesterId: 'emp-001',
  requesterName: '홍길동',
  departmentId: 'dept-001',
  departmentName: '구매팀',
  statusCode: 'PENDING',
  requestDate: '2026-01-10',
  totalAmount: 4200000,
};

/** 새 구매 요청 행. 요청자는 게이트웨이가 로그인에서 정하므로 목은 기본 행의 사람을 쓴다 */
const addRequisition = (state: PurchaseState, totalAmount: number) => {
  addCreated(state.createdRequisitions, (serial) => ({
    ...SEED_REQUISITION,
    purchaseRequisitionId: `pr-${serial}`,
    purchaseRequisitionNumber: `PR-2026-${serial}`,
    requestDate: toDateKey(new Date()),
    totalAmount,
  }));
};

const SEED_SUPPLIER: SupplierInfo = {
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
};
const SEED_MANAGER: ManagerInfo = {
  managerName: '정공급',
  managerPhone: '010-9999-0000',
  managerEmail: 'manager@supplier.co.kr',
};

/** 수정 요청(평평한 본문)을 공급사 정보에 덮는다. 본문의 deliverLeadTime 은 계약의 철자 그대로다 */
const editedSupplier = (info: SupplierInfo, edit: SupplierEdit | undefined): SupplierInfo =>
  edit
    ? {
        ...info,
        supplierName: edit.supplierName,
        supplierEmail: edit.supplierEmail,
        supplierPhone: edit.supplierPhone,
        supplierBaseAddress: edit.supplierBaseAddress,
        supplierDetailAddress: edit.supplierDetailAddress,
        supplierStatusCode: edit.statusCode,
        category: edit.category,
        deliveryLeadTime: edit.deliverLeadTime,
      }
    : info;

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
  http.get(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load purchase requisitions', 500);
    const state = purchaseState(request);
    const content = [SEED_REQUISITION, ...state.createdRequisitions].map((row) => ({
      ...row,
      statusCode: state.requisitionStatus.get(row.purchaseRequisitionId) ?? row.statusCode,
    }));
    return ok({ content, page: makePage(0, 10, content.length) });
  }),
  http.post<PathParams, Schema<'CreatePurchaseRequestBody'>>(
    PURCHASE_ENDPOINTS.PURCHASE_REQUESTS,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create purchase requisition', 500);
      const { items } = await request.json();
      addRequisition(
        purchaseState(request),
        items.reduce((sum, item) => sum + item.quantity * item.expectedUnitPrice, 0),
      );
      return ok(null);
    },
  ),
  http.post<PathParams, Schema<'CreateStockPurchaseRequestBody'>>(
    PURCHASE_ENDPOINTS.STOCK_PURCHASE_REQUESTS,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create stock purchase requisition', 500);
      const state = purchaseState(request);
      const { items } = await request.json();
      // 본문에 단가가 없어 금액은 0 이다
      addRequisition(state, 0);
      for (const item of items) if (item.mrpRunId) state.requestedMrpRuns.add(item.mrpRunId);
      return ok(null);
    },
  ),
  http.get<{ prId: string }>(
    `${PURCHASE_BASE_PATH}/purchase-requisitions/:prId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load requisition detail', 500);
      return ok({
        id: params.prId,
        purchaseRequisitionNumber: 'PR-2026-001',
        requesterId: 'emp-001',
        requesterName: '홍길동',
        departmentId: 'dept-001',
        departmentName: '구매팀',
        requestDate: '2026-01-10',
        statusCode: purchaseState(request).requisitionStatus.get(params.prId) ?? 'PENDING',
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
    },
  ),
  http.post<{ prId: string }>(
    `${PURCHASE_BASE_PATH}/purchase-requisitions/:prId/release`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to approve requisition', 500);
      purchaseState(request).requisitionStatus.set(params.prId, 'APPROVAL');
      return ok(null);
    },
  ),
  http.post<{ prId: string }>(
    `${PURCHASE_BASE_PATH}/purchase-requisitions/:prId/reject`,
    async ({ request, params }) => {
      if (shouldError(request)) return error('Failed to reject requisition', 500);
      // 게이트웨이 DTO 는 comment 만 받는다(계약도 문자열 필수). 다른 이름으로 오면 사유가 비므로 목에서 막는다
      const body: unknown = await request.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('comment' in body) ||
        typeof body.comment !== 'string'
      )
        return error('comment is required', 400);
      purchaseState(request).requisitionStatus.set(params.prId, 'REJECTED');
      return ok(null);
    },
  ),
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
          statusCode: purchaseState(request).orderStatus.get('po-001') ?? 'PENDING',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.post<{ poId: string }>(
    `${PURCHASE_BASE_PATH}/purchase-orders/:poId/approve`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to approve purchase order', 500);
      purchaseState(request).orderStatus.set(params.poId, 'APPROVAL');
      return ok(null);
    },
  ),
  http.post(
    new RegExp(`${PURCHASE_BASE_PATH}/purchase-orders/[^/]+/reject$`),
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to reject purchase order', 500);
      // 게이트웨이 DTO 는 reason 만 받는다. 다른 이름으로 오면 사유가 비므로 목에서 막는다
      const body: unknown = await request.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('reason' in body) ||
        typeof body.reason !== 'string'
      )
        return error('reason is required', 400);
      // 주소가 .../purchase-orders/{id}/reject 라 id 는 뒤에서 둘째 조각
      purchaseState(request).orderStatus.set(pathSegment(request, 2), 'REJECTED');
      return ok(null);
    },
  ),
  http.post(new RegExp(`${PURCHASE_BASE_PATH}/[^/]+/start-delivery`), ({ request }) => {
    if (shouldError(request)) return error('Failed to start delivery', 500);
    purchaseState(request).orderStatus.set(pathSegment(request, 2), 'DELIVERING');
    return ok(null);
  }),
  http.get<{ purchaseId: string }>(
    `${PURCHASE_BASE_PATH}/purchase-orders/:purchaseId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load purchase order detail', 500);
      return ok({
        statusCode: purchaseState(request).orderStatus.get(params.purchaseId) ?? 'PENDING',
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
    },
  ),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER, ({ request }) => {
    if (shouldError(request)) return error('Failed to load suppliers', 500);
    const state = purchaseState(request);
    const content = [SEED_SUPPLIER, ...state.createdSuppliers.map((s) => s.supplierInfo)].map(
      (info) => {
        const supplierInfo = editedSupplier(info, state.supplierEdits.get(info.supplierId));
        return { statusCode: supplierInfo.supplierStatusCode, supplierInfo };
      },
    );
    return ok({ content, page: makePage(0, 10, content.length) });
  }),
  http.get<{ supplierId: string }>(
    `${PURCHASE_BASE_PATH}/supplier/:supplierId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load supplier detail', 500);
      const state = purchaseState(request);
      const { supplierId } = params;
      const created = state.createdSuppliers.find((s) => s.supplierInfo.supplierId === supplierId);
      const edit = state.supplierEdits.get(supplierId);
      const managerInfo = created?.managerInfo ?? SEED_MANAGER;
      return ok({
        // 모르는 id 는 예전처럼 기본 공급사 본문에 id 만 바꿔 준다
        supplierInfo: editedSupplier(
          created?.supplierInfo ?? { ...SEED_SUPPLIER, supplierId },
          edit,
        ),
        managerInfo: edit
          ? {
              managerName: edit.managerName,
              managerPhone: edit.managerPhone,
              managerEmail: edit.managerEmail,
            }
          : managerInfo,
      });
    },
  ),
  http.post<PathParams, Schema<'CreateSupplierBody'>>(
    PURCHASE_ENDPOINTS.SUPPLIER,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create supplier', 500);
      const state = purchaseState(request);
      const { supplierInfo, managerInfo } = await request.json();
      addCreated(state.createdSuppliers, (serial) => ({
        supplierInfo: {
          ...supplierInfo,
          supplierDetailAddress: supplierInfo.supplierDetailAddress ?? null,
          supplierId: `sup-${serial}`,
          supplierNumber: `SUP-${serial}`,
          supplierStatusCode: 'ACTIVE',
        },
        managerInfo,
      }));
      return ok(null);
    },
  ),
  http.patch<{ supplierId: string }, SupplierEdit>(
    `${PURCHASE_BASE_PATH}/supplier/:supplierId`,
    async ({ request, params }) => {
      if (shouldError(request)) return error('Failed to update supplier', 500);
      purchaseState(request).supplierEdits.set(params.supplierId, await request.json());
      return ok(null);
    },
  ),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_REQUEST_STATUS_OPTIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load PR status dropdown', 500);
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'APPROVED', value: '승인' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_REQUEST_SEARCH_TYPE_OPTIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load PR search type dropdown', 500);
    return ok([
      { key: 'NUMBER', value: '요청 번호' },
      { key: 'REQUESTER', value: '요청자' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_ORDER_STATUS_OPTIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load PO status dropdown', 500);
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'APPROVED', value: '승인' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_ORDER_SEARCH_TYPE_OPTIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load PO search type dropdown', 500);
    return ok([
      { key: 'NUMBER', value: '발주 번호' },
      { key: 'SUPPLIER', value: '공급업체' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER_CATEGORY_OPTIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier category dropdown', 500);
    return ok([
      // 코드는 응답 enum(SupplierCategory)과 같다. 예전 SERVICE 는 목록 응답이 형식 오류로 막는 값이었다
      { key: 'MATERIAL', value: '원자재' },
      { key: 'PARTS', value: '부품' },
      { key: 'ETC', value: '기타' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER_SEARCH_TYPE_OPTIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier search dropdown', 500);
    return ok([
      { key: 'NAME', value: '공급업체명' },
      { key: 'NUMBER', value: '공급업체 코드' },
    ]);
  }),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER_STATUS_OPTIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier status dropdown', 500);
    return ok([
      { key: 'ACTIVE', value: '활성' },
      { key: 'INACTIVE', value: '비활성' },
    ]);
  }),
];
