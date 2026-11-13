import { http, type PathParams } from 'msw';
import {
  PURCHASE_BASE_PATH,
  PURCHASE_ENDPOINTS,
} from '@/app/(private)/purchase/api/purchase.endpoints';
import type { Schema } from '@/lib/api/contract';
import { addCreated, mockState } from '../state';
import { catalogItem } from './catalog';
import { monthlyMetric } from './financeAnalytics.handlers';
import {
  ACTIVE_SUPPLIERS,
  EMPLOYEES,
  MATERIALS,
  SUPPLIERS,
  addDays,
  departmentIdOf,
  todayKey,
} from './seed';
import {
  ok,
  error,
  notFound,
  shouldError,
  pathSegment,
  paged,
  filterBy,
  newestFirst,
  flow,
  statResponse,
  type FilterRules,
} from './utils';

type Requisition = Schema<'PurchaseRequestListItem'>;
// 수정과 등록 본문은 상태와 분류를 글자로 보낸다. 목은 받은 값을 그대로 돌려주므로 enum 으로 좁히지 않는다
type SupplierInfo = Omit<Schema<'SupplierInfo'>, 'supplierStatusCode' | 'category'> & {
  supplierStatusCode: string;
  category: string;
};
type SupplierEdit = Schema<'UpdateSupplierBody'>;
type ManagerInfo = Schema<'ManagerInfo'>;
/** 구매 요청 상세의 품목 줄 */
interface RequisitionLine {
  itemId: number;
  itemName: string;
  dueDate: string;
  quantity: number;
  uomCode: string;
  unitPrice: number;
  amount: number;
}

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
  /** 새 구매 요청의 품목 줄(요청 id → 줄) */
  requisitionLines: Map<string, RequisitionLine[]>;
}>(() => ({
  requisitionStatus: new Map(),
  createdRequisitions: [],
  orderStatus: new Map(),
  createdSuppliers: [],
  supplierEdits: new Map(),
  requestedMrpRuns: new Set(),
  requisitionLines: new Map(),
}));
type PurchaseState = ReturnType<typeof purchaseState>;

/** 요청자(직원 목록의 사람)로 구매 요청 행의 요청자 칸을 채운다 */
const requester = (name: string) => {
  const person = EMPLOYEES.find((row) => row.name === name) ?? EMPLOYEES[0];
  return {
    requesterId: person.employeeId,
    requesterName: person.name,
    departmentId: departmentIdOf(person.department),
    departmentName: person.department,
  };
};

const SEED_REQUISITION: Requisition = {
  purchaseRequisitionId: 'pr-001',
  purchaseRequisitionNumber: 'PR-2026-001',
  ...requester('홍길동'),
  statusCode: 'PENDING',
  requestDate: '2026-01-10',
  totalAmount: 4200000,
};

/**
 * 발주서 PO-2026-001 의 품목 줄(목록의 "원자재 A 외 2건"). 합이 총액 4,200,000 이다(카드 "목 데이터 현실성").
 * 같은 거래의 구매 요청 PR-2026-001 과 매입 전표 AP-2026-001 도 이 줄을 쓴다
 */
export const PURCHASE_ORDER_LINES = [
  {
    itemId: 'item-2001',
    itemName: '원자재 A',
    quantity: 150,
    uomName: 'EA',
    unitPrice: 20000,
    totalPrice: 3000000,
  },
  {
    itemId: 'item-2002',
    itemName: '원자재 B',
    quantity: 100,
    uomName: 'EA',
    unitPrice: 9000,
    totalPrice: 900000,
  },
  {
    itemId: 'item-2003',
    itemName: '원자재 C',
    quantity: 60,
    uomName: 'EA',
    unitPrice: 5000,
    totalPrice: 300000,
  },
];
type PurchaseOrder = Schema<'PurchaseOrderListItem'>;
type OrderLine = (typeof PURCHASE_ORDER_LINES)[number];
/**
 * 발주서 씨앗(카드 "데모 데이터 채우기"). po-001 은 예전 값 그대로(입고 대기 목록, 매입 전표가 같은 거래를 쓴다).
 * po-002~015 는 2026-09-29 부터 사흘 간격, 공급사는 공급사 목록의 활성 공급사, 품목은 품목표의 자재 2~3줄.
 * 오래된 발주는 입고 완료와 배송중, 최근은 승인과 대기가 많고 반려가 섞인다. 가장 최근(po-015)은 대기
 */
const PO_STATUSES: Array<PurchaseOrder['statusCode']> = [
  'DELIVERED',
  'DELIVERED',
  'DELIVERED',
  'REJECTED',
  'DELIVERED',
  'DELIVERING',
  'DELIVERING',
  'APPROVAL',
  'REJECTED',
  'APPROVAL',
  'APPROVAL',
  'PENDING',
  'PENDING',
  'PENDING',
];
const SEED_PURCHASE_ORDERS: Array<{ row: PurchaseOrder; supplierId: string; lines: OrderLine[] }> =
  [
    {
      row: {
        purchaseOrderId: 'po-001',
        purchaseOrderNumber: 'PO-2026-001',
        supplierName: '대양상사',
        itemsSummary: '원자재 A 외 2건',
        orderDate: '2026-01-08',
        dueDate: '2026-01-30',
        totalAmount: 4200000,
        statusCode: 'PENDING',
      },
      supplierId: 'sup-001',
      lines: PURCHASE_ORDER_LINES,
    },
    ...PO_STATUSES.map((statusCode, i) => {
      const serial = String(i + 2).padStart(3, '0');
      const supplier = ACTIVE_SUPPLIERS[i % ACTIVE_SUPPLIERS.length].supplierInfo;
      const orderDate = addDays('2026-09-29', i * 3);
      // 목록의 "외 N건" 이 늘 맞게 두세 줄
      const lines = Array.from({ length: ((i + 1) % 2) + 2 }, (_, k) => {
        const item = MATERIALS[(i * 3 + k + 5) % MATERIALS.length];
        const quantity = 100 + ((i * 5 + k * 7) % 9) * 50;
        return {
          itemId: item.itemId,
          itemName: item.itemName,
          quantity,
          uomName: 'EA',
          unitPrice: item.unitPrice,
          totalPrice: quantity * item.unitPrice,
        };
      });
      return {
        row: {
          purchaseOrderId: `po-${serial}`,
          purchaseOrderNumber: `PO-2026-${serial}`,
          supplierName: supplier.supplierName,
          itemsSummary: `${lines[0].itemName} 외 ${lines.length - 1}건`,
          orderDate,
          dueDate: addDays(orderDate, supplier.deliveryLeadTime + 7),
          totalAmount: lines.reduce((sum, item) => sum + item.totalPrice, 0),
          statusCode,
        },
        supplierId: supplier.supplierId,
        lines,
      };
    }),
  ];

/** 발주서 목록. 바뀐 상태를 덮고 발주일 최신순 */
const purchaseOrdersOf = (request: Request) => {
  const { orderStatus } = purchaseState(request);
  return SEED_PURCHASE_ORDERS.map(({ row }) => ({
    ...row,
    statusCode: orderStatus.get(row.purchaseOrderId) ?? row.statusCode,
  })).sort(
    newestFirst(
      (row) => row.orderDate,
      (row) => row.purchaseOrderId,
    ),
  );
};

/** 공급사 목록. 기본 공급사와 그 로그인이 등록한 공급사 */
const suppliersOf = (request: Request) => [
  ...SUPPLIERS,
  ...purchaseState(request).createdSuppliers,
];

const SEED_REQUISITION_LINES: RequisitionLine[] = PURCHASE_ORDER_LINES.map((item, i) => ({
  itemId: i + 1,
  itemName: item.itemName,
  dueDate: '2026-02-01',
  quantity: item.quantity,
  uomCode: item.uomName,
  unitPrice: item.unitPrice,
  amount: item.totalPrice,
}));

/**
 * 구매 요청 씨앗 pr-002~015(카드 "데모 데이터 채우기"). 2026-10-01 부터 사흘 간격, 요청자는 직원 목록, 품목은 품목표의 자재
 * 1~3줄. 상태는 대기, 승인, 반려가 섞이고 가장 최근(pr-015)은 대기
 */
const PR_REQUESTERS = ['윤지호', '장하은', '권태호', '황민서', '임준서', '우진혁', '안재원'];
const PR_STATUSES = ['APPROVAL', 'APPROVAL', 'REJECTED', 'PENDING', 'APPROVAL'];
const SEED_REQUISITIONS: Array<{ row: Requisition; lines: RequisitionLine[] }> = [
  { row: SEED_REQUISITION, lines: SEED_REQUISITION_LINES },
  ...Array.from({ length: 14 }, (_, i) => {
    const serial = String(i + 2).padStart(3, '0');
    const requestDate = addDays('2026-10-01', i * 3);
    const lines = Array.from({ length: (i % 3) + 1 }, (_, k) => {
      const item = MATERIALS[(i * 2 + k) % MATERIALS.length];
      const quantity = 50 + ((i * 7 + k * 3) % 10) * 25;
      return {
        itemId: k + 1,
        itemName: item.itemName,
        dueDate: addDays(requestDate, 14),
        quantity,
        uomCode: 'EA',
        unitPrice: item.unitPrice,
        amount: quantity * item.unitPrice,
      };
    });
    return {
      row: {
        purchaseRequisitionId: `pr-${serial}`,
        purchaseRequisitionNumber: `PR-2026-${serial}`,
        ...requester(PR_REQUESTERS[i % PR_REQUESTERS.length]),
        statusCode: i === 13 ? 'PENDING' : PR_STATUSES[i % PR_STATUSES.length],
        requestDate,
        totalAmount: lines.reduce((sum, item) => sum + item.amount, 0),
      },
      lines,
    };
  }),
];

/** 새 구매 요청 행. 요청자는 게이트웨이가 로그인에서 정하므로 목은 기본 행의 사람을 쓴다. 총액은 줄 금액 합 */
const addRequisition = (state: PurchaseState, lines: RequisitionLine[]) => {
  addCreated(
    state.createdRequisitions,
    (serial) => {
      state.requisitionLines.set(`pr-${serial}`, lines);
      return {
        ...SEED_REQUISITION,
        purchaseRequisitionId: `pr-${serial}`,
        purchaseRequisitionNumber: `PR-2026-${serial}`,
        requestDate: todayKey(),
        totalAmount: lines.reduce((sum, item) => sum + item.amount, 0),
      };
    },
    SEED_REQUISITIONS.length + 1,
    // 상한으로 밀려난 요청의 줄도 같이 지운다(리뷰 A2)
    (dropped) => state.requisitionLines.delete(dropped.purchaseRequisitionId),
  );
};

/** 구매 요청 목록. 기본 행과 새 행에 바뀐 상태를 덮는다. 요청일 최신순(새 요청은 오늘이라 맨 위) */
const requisitionsOf = (request: Request) => {
  const state = purchaseState(request);
  return [...SEED_REQUISITIONS.map(({ row }) => row), ...state.createdRequisitions]
    .map((row) => ({
      ...row,
      statusCode: state.requisitionStatus.get(row.purchaseRequisitionId) ?? row.statusCode,
    }))
    .sort(
      newestFirst(
        (row) => row.requestDate,
        (row) => row.purchaseRequisitionId,
      ),
    );
};

/**
 * 목록 필터(카드 "목 필터와 검색"). 파라미터 이름은 게이트웨이와 같다(MmController.java:42-49, :228-235, :414-418).
 * 검색 타입 값(NUMBER, REQUESTER, SUPPLIER, NAME)은 이 목의 드롭다운 값이다. 게이트웨이 설명의 값은 다르다(카드 별도 보고)
 */
const REQUISITION_FILTER: FilterRules<Requisition> = {
  equals: { statusCode: (row) => row.statusCode },
  date: (row) => row.requestDate,
  search: {
    NUMBER: (row) => row.purchaseRequisitionNumber,
    REQUESTER: (row) => row.requesterName,
  },
};
const ORDER_FILTER: FilterRules<PurchaseOrder> = {
  equals: { statusCode: (row) => row.statusCode },
  date: (row) => row.orderDate,
  search: {
    NUMBER: (row) => row.purchaseOrderNumber,
    SUPPLIER: (row) => row.supplierName,
  },
};
const SUPPLIER_FILTER: FilterRules<{ supplierInfo: SupplierInfo }> = {
  equals: {
    category: (row) => row.supplierInfo.category,
    statusCode: (row) => row.supplierInfo.supplierStatusCode,
  },
  search: {
    NAME: (row) => row.supplierInfo.supplierName,
    NUMBER: (row) => row.supplierInfo.supplierNumber,
  },
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

/** 공급사 담당자. 수정했으면 수정한 값이다(공급사 상세와 발주 상세가 같이 쓴다) */
const supplierManager = (state: PurchaseState, supplierId: string): ManagerInfo => {
  const edit = state.supplierEdits.get(supplierId);
  if (edit)
    return {
      managerName: edit.managerName,
      managerPhone: edit.managerPhone,
      managerEmail: edit.managerEmail,
    };
  return (
    [...SUPPLIERS, ...state.createdSuppliers].find((s) => s.supplierInfo.supplierId === supplierId)
      ?.managerInfo ?? SUPPLIERS[0].managerInfo
  );
};

export const purchaseHandlers = [
  http.get(PURCHASE_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load purchase stats', 500);
    // 발주 금액은 재무 월별 손익의 매입, 구매 요청 건수의 주 값은 그 로그인의 구매 요청 목록 행 수(리뷰 관찰 1)
    return ok(
      statResponse({
        purchaseOrderAmount: monthlyMetric('purchases'),
        purchaseRequestCount: flow(requisitionsOf(request).length),
      }),
    );
  }),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER_ORDERS_STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load supplier orders stats', 500);
    // 주 값은 발주서 목록 행 수(쓰기로 행이 늘지 않는다)
    return ok(statResponse({ orderCount: flow(SEED_PURCHASE_ORDERS.length) }));
  }),
  http.get(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load purchase requisitions', 500);
    return ok(paged(request, filterBy(request, requisitionsOf(request), REQUISITION_FILTER)));
  }),
  http.post<PathParams, Schema<'CreatePurchaseRequestBody'>>(
    PURCHASE_ENDPOINTS.PURCHASE_REQUESTS,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create purchase requisition', 500);
      const { items } = await request.json();
      addRequisition(
        purchaseState(request),
        items.map((item, i) => ({
          itemId: i + 1,
          itemName: item.itemName,
          dueDate: item.dueDate,
          quantity: item.quantity,
          uomCode: item.uomName,
          unitPrice: item.expectedUnitPrice,
          amount: item.quantity * item.expectedUnitPrice,
        })),
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
      // 본문에 단가와 품목 이름이 없다. 이름은 품목표에서 찾고(없으면 품목 id), 금액은 0 이다
      addRequisition(
        state,
        items.map((item, i) => ({
          itemId: i + 1,
          itemName: catalogItem(item.productId)?.itemName ?? item.productId,
          dueDate: '',
          quantity: item.quantity,
          uomCode: 'EA',
          unitPrice: 0,
          amount: 0,
        })),
      );
      for (const item of items) if (item.mrpRunId) state.requestedMrpRuns.add(item.mrpRunId);
      return ok(null);
    },
  ),
  http.get<{ prId: string }>(
    `${PURCHASE_BASE_PATH}/purchase-requisitions/:prId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load requisition detail', 500);
      const { prId } = params;
      // 목록의 그 행에서 만든다. 그 로그인의 목록에 없으면 404(카드 "없는 건은 404")
      const row = requisitionsOf(request).find((r) => r.purchaseRequisitionId === prId);
      if (!row) return notFound('구매요청서 상세 조회');
      return ok({
        id: prId,
        purchaseRequisitionNumber: row.purchaseRequisitionNumber,
        requesterId: row.requesterId,
        requesterName: row.requesterName,
        departmentId: row.departmentId,
        departmentName: row.departmentName,
        requestDate: row.requestDate,
        statusCode: row.statusCode,
        items:
          purchaseState(request).requisitionLines.get(prId) ??
          SEED_REQUISITIONS.find(({ row: seed }) => seed.purchaseRequisitionId === prId)?.lines ??
          SEED_REQUISITION_LINES,
        totalAmount: row.totalAmount,
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
    return ok(paged(request, filterBy(request, purchaseOrdersOf(request), ORDER_FILTER)));
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
      // 목록의 그 행에서 만든다. 목록에 없으면 404
      const row = purchaseOrdersOf(request).find(
        (order) => order.purchaseOrderId === params.purchaseId,
      );
      const seed = SEED_PURCHASE_ORDERS.find(
        (order) => order.row.purchaseOrderId === params.purchaseId,
      );
      if (!row || !seed) return notFound('발주서 상세 조회');
      const supplier = suppliersOf(request).find(
        (s) => s.supplierInfo.supplierId === seed.supplierId,
      );
      // 공급사 상세와 같은 담당자
      const manager = supplierManager(purchaseState(request), seed.supplierId);
      return ok({
        statusCode: row.statusCode,
        dueDate: row.dueDate,
        purchaseOrderId: params.purchaseId,
        purchaseOrderNumber: row.purchaseOrderNumber,
        orderDate: row.orderDate,
        supplierId: seed.supplierId,
        supplierNumber: supplier?.supplierInfo.supplierNumber ?? '',
        supplierName: row.supplierName,
        managerPhone: manager.managerPhone,
        managerEmail: manager.managerEmail,
        items: seed.lines,
        totalAmount: row.totalAmount,
        note: '납기 준수 요청',
      });
    },
  ),
  http.get(PURCHASE_ENDPOINTS.SUPPLIER, ({ request }) => {
    if (shouldError(request)) return error('Failed to load suppliers', 500);
    const state = purchaseState(request);
    const content = suppliersOf(request).map(({ supplierInfo: info }) => {
      const supplierInfo = editedSupplier(info, state.supplierEdits.get(info.supplierId));
      return { statusCode: supplierInfo.supplierStatusCode, supplierInfo };
    });
    return ok(paged(request, filterBy(request, content, SUPPLIER_FILTER)));
  }),
  http.get<{ supplierId: string }>(
    `${PURCHASE_BASE_PATH}/supplier/:supplierId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load supplier detail', 500);
      const state = purchaseState(request);
      const { supplierId } = params;
      const info = suppliersOf(request).find(
        (s) => s.supplierInfo.supplierId === supplierId,
      )?.supplierInfo;
      // 목록(기본 공급사와 그 로그인이 등록한 공급사)에 없으면 404
      if (!info) return notFound('공급업체 상세 조회');
      return ok({
        supplierInfo: editedSupplier(info, state.supplierEdits.get(supplierId)),
        managerInfo: supplierManager(state, supplierId),
      });
    },
  ),
  http.post<PathParams, Schema<'CreateSupplierBody'>>(
    PURCHASE_ENDPOINTS.SUPPLIER,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create supplier', 500);
      const state = purchaseState(request);
      const { supplierInfo, managerInfo } = await request.json();
      addCreated(
        state.createdSuppliers,
        (serial) => ({
          supplierInfo: {
            ...supplierInfo,
            supplierDetailAddress: supplierInfo.supplierDetailAddress ?? null,
            supplierId: `sup-${serial}`,
            supplierNumber: `SUP-${serial}`,
            supplierStatusCode: 'ACTIVE',
          },
          managerInfo,
        }),
        SUPPLIERS.length + 1,
      );
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
    // 코드는 행의 상태 값이다. 게이트웨이 옛 목(mockdata/scmpp/controller/MmController.java:1706)과 목록 파라미터 설명(:228)
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'APPROVAL', value: '승인' },
      { key: 'REJECTED', value: '반려' },
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
    // 승인 코드는 행의 상태 값 APPROVAL(예전 APPROVED 는 어느 행에도 없어 고르면 빈 목록이었다)
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'APPROVAL', value: '승인' },
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
