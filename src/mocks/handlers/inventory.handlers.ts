import { http, type PathParams } from 'msw';
import { INVENTORY_BASE_PATH, INVENTORY_ENDPOINTS, LOWSTOCK_ENDPOINTS } from '@/app/types/api';
import type { Schema } from '@/lib/api/contract';
import { mockState } from '../state';
import { BEARING, MOTOR, WAREHOUSE_ITEMS, catalogItem, type CatalogItem } from './catalog';
import { WAREHOUSES } from './seed';
import {
  ok,
  okNoData,
  error,
  notFound,
  shouldError,
  pathSegment,
  isoNow,
  makePage,
  flow,
  level,
  statResponse,
} from './utils';

/**
 * 재고 목이 기억하는 쓰기 결과(로그인별, `src/mocks/state.ts`).
 * 안전재고 수정과 재고 이동은 화면이 응답 전에 값을 바꾼다(낙관적). 목이 안 따르면 다시 가져올 때 원래 값으로 돌아간다.
 * 재고 상태(NORMAL, URGENT)는 다시 계산하지 않는다. 서버 기준을 모른다(verified=false)
 */
const inventoryState = mockState<{
  safetyStock: Map<string, number>;
  /** 품목 id → 기본 창고(wh-001)에서 나간 수량. 들어온 것은 음수 */
  movedOut: Map<string, number>;
  /** 배송을 시작한 주문. 출고 준비 완료 목록에서 빠진다 */
  shippedOrders: Set<string>;
}>(() => ({ safetyStock: new Map(), movedOut: new Map(), shippedOrders: new Set() }));

/** 재고 상세 목의 창고. 재고 이동은 이 창고에서 나가거나 들어올 때만 현재고가 바뀐다 */
const DETAIL_WAREHOUSE_ID = 'wh-001';

/** 품목표의 처음 재고에 쓰기 결과를 덮는다. 같은 품목은 어느 조회에서나(재고 추이 목 포함) 같은 수량이다 */
export const stockOf = (request: Request, item: CatalogItem) => {
  const state = inventoryState(request);
  return {
    currentStock: item.current - (state.movedOut.get(item.itemId) ?? 0),
    safetyStock: state.safetyStock.get(item.itemId) ?? item.safety,
  };
};

/** 품목 한 줄의 공통 칸. 금액은 지금 현재고 × 단가. 상태는 처음 값에서 정하고 쓰기 뒤에 다시 계산하지 않는다 */
const itemRow = (request: Request, item: CatalogItem) => {
  const stock = stockOf(request, item);
  return {
    itemId: item.itemId,
    itemNumber: item.itemNumber,
    itemName: item.itemName,
    category: item.category,
    ...stock,
    uomName: 'EA',
    unitPrice: item.unitPrice,
    totalAmount: stock.currentStock * item.unitPrice,
    statusCode: item.current < item.safety ? 'URGENT' : 'NORMAL',
  };
};

/** 일반 재고 목록의 행(1공장 창고의 모터 A) */
const inventoryRows = (request: Request) => [
  {
    ...itemRow(request, MOTOR),
    forShipmentStock: 30,
    reservedStock: 10,
    warehouseName: '1공장 창고',
    warehouseType: 'RAW',
    shelfNumber: 12,
  },
];

/** 출고 준비 완료 목록의 처음 행 */
const READY_TO_SHIP = [
  {
    salesOrderId: 'so-002',
    salesOrderNumber: 'SO-2026-002',
    customerName: '미래전자',
    orderDate: '2026-01-10',
    dueDate: '2026-02-02',
    productionCompletionDate: '2026-01-25',
    readyToShipDate: '2026-01-26',
    totalAmount: 5200000,
    // 예전 값 READT_TO_SHIP 은 팀 FE 타입의 오타였다(게이트웨이 사본에 없다). 실서버 값은 확인하지 못했다(verified=false).
    // 게이트웨이 옛 목 데이터의 목록 값이 READY_TO_SHIP 이다. 계약과 화면은 READY_FOR_SHIPMENT 도 받는다
    statusCode: 'READY_TO_SHIP',
  },
];

/** 출고 준비 완료 목록. 배송을 시작한 주문은 배송중이 되어 빠진다(게이트웨이 OrderController.java:239) */
const readyToShipOf = (request: Request) =>
  READY_TO_SHIP.filter((order) => !inventoryState(request).shippedOrders.has(order.salesOrderId));

/**
 * 통계 건수는 아래 목록의 행 수와 같다(입고 완료 1, 입고 대기 1, 출고 대기는 그 로그인이 배송을 시작하면 준다).
 * 입고 목록은 쓰기가 없어 늘 1, 출고 완료 목록은 목에 없어 같은 크기(1)로 둔다. 재고 금액은 일반 재고 목록의 금액 합이다(지금 값)
 */
const inventoryStats = (request: Request) =>
  statResponse({
    total_stock: level(inventoryRows(request).reduce((sum, row) => sum + row.totalAmount, 0)),
    store_complete: flow(1),
    store_pending: flow(1),
    delivery_complete: flow(1),
    delivery_pending: flow(readyToShipOf(request).length),
  });

/** 안전재고 목록(베어링 B). 긴급 건수 통계가 이 행 수를 쓴다 */
const LOW_STOCK_ITEMS = [BEARING];
const mockLowStockStats = statResponse({
  total_emergency: flow(LOW_STOCK_ITEMS.filter((item) => item.current < item.safety).length),
  total_warning: flow(0),
});

/** 창고 하나의 재고(시각화 8). 품목표의 14개에 안전재고 수정과 재고 이동을 다른 조회와 똑같이 덮는다 */
const warehouseStock = (request: Request, warehouseName: string) =>
  WAREHOUSE_ITEMS.map((item, i) => ({
    ...itemRow(request, item),
    forShipmentStock: 0,
    reservedStock: 0,
    warehouseName,
    warehouseType: 'RAW',
    shelfNumber: i + 1,
  }));

export const inventoryHandlers = [
  // ----------------------- Inventory -----------------------
  http.get(INVENTORY_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load inventory stats', 500);
    return ok(inventoryStats(request));
  }),
  http.get(INVENTORY_ENDPOINTS.INVENTORY_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load inventory list', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    // 창고 3D(시각화 8)는 창고 이름으로 거른다. 그 창고의 품목 14개(재고율 4단계와 기준 없음이 다 나온다)
    const keyword = url.searchParams.get('keyword');
    if (url.searchParams.get('type') === 'WAREHOUSE_NAME' && keyword) {
      const content = warehouseStock(request, keyword);
      return ok({ content: content.slice(0, size), page: makePage(page, size, content.length) });
    }
    const content = inventoryRows(request);
    return ok({ content, page: makePage(page, size, content.length) });
  }),
  http.get<{ itemId: string }>(`${INVENTORY_BASE_PATH}/iv/items/:itemId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load inventory detail', 500);
    // 목록(일반, 안전재고, 창고별)의 품목은 품목표에서 찾는다. 품목표에 없으면 404(카드 "없는 건은 404")
    const item = catalogItem(params.itemId);
    if (!item) return notFound('재고 상세 조회');
    return ok({
      ...itemRow(request, item),
      supplierCompanyName: '대양상사',
      warehouseId: DETAIL_WAREHOUSE_ID,
      warehouseName: '1공장 창고',
      warehouseNumber: 'WH-001',
      location: 'A-1',
      lastModified: isoNow,
      description: `${item.itemName} 표준 규격`,
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
      content: LOW_STOCK_ITEMS.map((item) => {
        const { itemId, itemName, currentStock, safetyStock, uomName, statusCode } = itemRow(
          request,
          item,
        );
        return { itemId, itemName, currentStock, safetyStock, uomName, statusCode };
      }),
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
  http.post<PathParams, Schema<'StockMovementRequest'>>(
    INVENTORY_ENDPOINTS.RECENT_STOCK_MOVEMENT,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to post stock movement', 500);
      const { movedOut } = inventoryState(request);
      const { itemId, fromWarehouseId, toWarehouseId, stockQuantity } = await request.json();
      // 이동 기록 행은 만들지 않는다(기록의 종류 코드와 창고 이름을 목이 모른다). 현재고만 따른다
      const direction =
        (fromWarehouseId === DETAIL_WAREHOUSE_ID ? 1 : 0) -
        (toWarehouseId === DETAIL_WAREHOUSE_ID ? 1 : 0);
      movedOut.set(itemId, (movedOut.get(itemId) ?? 0) + direction * stockQuantity);
      return okNoData();
    },
  ),
  http.patch(new RegExp(`${INVENTORY_BASE_PATH}/iv/items/[^/]+/safety-stock`), ({ request }) => {
    if (shouldError(request)) return error('Failed to update safety stock', 500);
    // 주소가 .../iv/items/{id}/safety-stock?safetyStock=N. 계약에서 safetyStock 은 필수다
    const raw = new URL(request.url).searchParams.get('safetyStock');
    const safetyStock = Number(raw);
    // Number(null) 과 Number('') 는 0 이다. 값이 없으면 0 으로 저장하지 않고 거절한다
    if (!raw?.trim() || !Number.isFinite(safetyStock)) return error('safetyStock is required', 400);
    inventoryState(request).safetyStock.set(pathSegment(request, 2), safetyStock);
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
          // 실서버 값은 확인하지 못했다(verified=false). 게이트웨이 옛 목 데이터와 같은 목의 상세가 IN_PRODUCTION 이고,
          // 팀 FE 타입은 PRODUCTION 이었다. 계약과 화면은 둘 다 받는다(카드 "목이 쓰기 결과를 따르게" 리뷰 반영 11)
          statusCode: 'IN_PRODUCTION',
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
    const content = readyToShipOf(request);
    return ok({ content, page: makePage(page, size, content.length) });
  }),
  http.get(`${INVENTORY_BASE_PATH}/sales-orders/production/:itemId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load production detail', 500);
    // 생산중 주문 목록은 so-001 한 행이다
    if (params.itemId !== 'so-001') return notFound('생산중 주문 상세 조회');
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
    // 출고 준비 목록(배송을 시작하면 빠진다)에 없으면 404
    if (!readyToShipOf(request).some((order) => order.salesOrderId === params.itemId))
      return notFound('출고 준비 주문 상세 조회');
    return ok({
      salesOrderId: params.itemId,
      salesOrderNumber: 'SO-2026-002',
      customerCompanyName: '미래전자',
      dueDate: '2026-02-02',
      statusCode: 'READY_TO_SHIP',
      orderItems: [{ itemId: 'item-1002', itemName: '베어링 B', quantity: 50, uomName: 'EA' }],
    });
  }),
  http.patch<{ orderId: string }>(
    `${INVENTORY_BASE_PATH}/sales-orders/:orderId/status`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to update shipping status', 500);
      inventoryState(request).shippedOrders.add(params.orderId);
      return ok({
        salesOrderId: 'so-001',
        salesOrderCode: 'SO-2026-001',
        status: 'READY_TO_SHIP',
      });
    },
  ),
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
          // 구매 목의 발주 목록과 같은 발주다(같은 날짜, 금액)
          orderDate: '2026-01-08',
          dueDate: '2026-01-30',
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
        itemId: MOTOR.itemId,
        unitPrice: MOTOR.unitPrice,
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
      // 창고 목록과 같은 표의 운영중 창고(`seed.ts`)
      warehouses: WAREHOUSES.filter((row) => row.statusCode === 'ACTIVE').map(
        ({ warehouseId, warehouseName, warehouseNumber }) => ({
          warehouseId,
          warehouseName,
          warehouseNumber,
        }),
      ),
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
        itemId: MOTOR.itemId,
        itemName: MOTOR.itemName,
        itemNmber: MOTOR.itemNumber,
        unitPrice: MOTOR.unitPrice,
        supplierName: '대양상사',
      },
    ]);
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
    const content = LOW_STOCK_ITEMS.map((item) => ({
      ...itemRow(request, item),
      warehouseName: '1공장 창고',
      warehouseNumber: 'WH-001',
    }));
    return ok({ content, page: makePage(page, size, content.length) });
  }),
];
