import { http, type PathParams } from 'msw';
import { INVENTORY_BASE_PATH, INVENTORY_ENDPOINTS, LOWSTOCK_ENDPOINTS } from '@/app/types/api';
import type { Schema } from '@/lib/api/contract';
import { purchaseOrdersOf } from './purchase.handlers';
import { orderLinesOf, ordersOf, startShipping } from './sales.handlers';
import { MOTOR, WAREHOUSE_ITEMS, catalogItem, type CatalogItem } from './catalog';
import { EMPLOYEES, WAREHOUSES, addDays, todayKey } from './seed';
import { DETAIL_WAREHOUSE_ID, inventoryState, stockOf, stockStatus } from './stock';
import {
  ok,
  okNoData,
  error,
  notFound,
  shouldError,
  pathSegment,
  isoNow,
  paged,
  filterBy,
  flow,
  hashUnit,
  level,
  statResponse,
} from './utils';

/**
 * 재고 목(카드 "데모 목록 재고 물류"). 재고 목록은 품목표 14개 전부, 안전재고 목록은 그중 현재고가 안전재고보다 적은 품목,
 * 생산중과 출고 준비는 영업 주문 목록, 입고 대기와 입고 완료는 발주 목록에서 거른다. 손으로 적은 행은 없다.
 * 쓰기 결과(안전재고, 재고 이동)는 `stock.ts`, 배송 시작은 영업 목, 발주 배송 시작은 구매 목이 기억한다(로그인별)
 */

/** 재고 목의 창고(1공장 창고). 품목은 모두 이 창고에 있다. 재고 상세와 재고 이동이 같은 창고를 쓴다 */
const HOME = WAREHOUSES.find((row) => row.warehouseId === DETAIL_WAREHOUSE_ID) ?? WAREHOUSES[0];

/** 품목 한 줄의 공통 칸. 금액은 지금 현재고 × 단가, 상태는 지금 현재고와 안전재고로 정한다 */
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
    statusCode: stockStatus(stock),
  };
};

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

const byItemNumber = (a: { itemNumber: string }, b: { itemNumber: string }) =>
  a.itemNumber.localeCompare(b.itemNumber);

/** 일반 재고 목록. 1공장 창고의 품목표 14개, 품목 번호순(마스터 목록 규칙) */
const inventoryRows = (request: Request) =>
  warehouseStock(request, HOME.warehouseName).sort(byItemNumber);

/** 안전재고 부족 목록. 품목표에서 지금 현재고가 안전재고보다 적은 품목(쓰기 뒤 값으로 다시 거른다), 품목 번호순 */
const shortageRows = (request: Request) =>
  WAREHOUSE_ITEMS.map((item) => ({
    ...itemRow(request, item),
    warehouseName: HOME.warehouseName,
    warehouseNumber: HOME.warehouseNumber,
  }))
    .filter((row) => row.currentStock < row.safetyStock)
    .sort(byItemNumber);

const DAY = 86_400_000;
/** 주문일에서 오늘까지 지난 날 수 */
const ageOf = (orderDate: string, today: string) =>
  (Date.parse(today) - Date.parse(orderDate)) / DAY;
const earlier = (a: string, b: string) => (a < b ? a : b);

/**
 * 생산중 주문(영업 주문 목록의 IN_PRODUCTION). 진행률은 주문 뒤 지난 날로 정한다(주문 4일째 시작, 하루 12%, 10~90%).
 * 진행률 규칙과 목록 상태 값은 verified=false. 상태 값은 같은 목의 상세와 계약 enum 이 받는 IN_PRODUCTION
 */
const productionRows = (request: Request) => {
  const today = todayKey();
  return ordersOf(request)
    .filter((order) => order.statusCode === 'IN_PRODUCTION')
    .map((order) => ({
      salesOrderId: order.salesOrderId,
      salesOrderNumber: order.salesOrderNumber,
      customerName: order.customerName,
      orderDate: order.orderDate,
      dueDate: order.dueDate,
      progress: Math.min(90, Math.max(10, (ageOf(order.orderDate, today) - 3) * 12)),
      totalAmount: order.totalAmount,
      statusCode: 'IN_PRODUCTION' as const,
    }));
};

/**
 * 출고 준비 주문(영업 주문 목록의 READY_FOR_SHIPMENT). 배송을 시작한 주문은 배송중이 되어 빠진다(게이트웨이 OrderController.java:239).
 * 생산 완료일은 주문 10일 뒤, 출고 준비일은 11일 뒤(영업 주문의 상태 기간), 오늘보다 늦으면 오늘(즉시 납품 주문). verified=false.
 * 목록 상태 값 READY_TO_SHIP 은 게이트웨이 옛 목 데이터의 목록 값이다(계약은 READY_FOR_SHIPMENT 도 받는다)
 */
const readyRows = (request: Request) => {
  const today = todayKey();
  return ordersOf(request)
    .filter((order) => order.statusCode === 'READY_FOR_SHIPMENT')
    .map((order) => ({
      salesOrderId: order.salesOrderId,
      salesOrderNumber: order.salesOrderNumber,
      customerName: order.customerName,
      orderDate: order.orderDate,
      dueDate: order.dueDate,
      productionCompletionDate: earlier(addDays(order.orderDate, 10), today),
      readyToShipDate: earlier(addDays(order.orderDate, 11), today),
      totalAmount: order.totalAmount,
      statusCode: 'READY_TO_SHIP' as const,
    }));
};

/** 입고 목록의 행. 발주 목록(바뀐 상태 포함, 발주일 최신순)에서 그 상태만 */
const receivingRowsOf = (request: Request, from: 'DELIVERING' | 'DELIVERED') =>
  purchaseOrdersOf(request)
    .filter((order) => order.statusCode === from)
    .map((order) => ({
      purchaseOrderId: order.purchaseOrderId,
      purchaseOrderNumber: order.purchaseOrderNumber,
      supplierCompanyName: order.supplierName,
      orderDate: order.orderDate,
      dueDate: order.dueDate,
      totalAmount: order.totalAmount,
      statusCode: from === 'DELIVERING' ? ('PENDING' as const) : ('RECEIVED' as const),
    }));

/**
 * 통계 건수는 아래 목록의 행 수와 같다. 출고 완료는 목록이 없어 배송중(출고를 마친) 영업 주문 수로 둔다(verified=false).
 * 재고 금액은 재고 목록 전부의 금액 합이다(지금 값)
 */
const inventoryStats = (request: Request) =>
  statResponse({
    total_stock: level(inventoryRows(request).reduce((sum, row) => sum + row.totalAmount, 0)),
    store_complete: flow(receivingRowsOf(request, 'DELIVERED').length),
    store_pending: flow(receivingRowsOf(request, 'DELIVERING').length),
    delivery_complete: flow(
      ordersOf(request).filter((order) => order.statusCode === 'DELIVERING').length,
    ),
    delivery_pending: flow(readyRows(request).length),
  });

const lowStockStats = (request: Request) => {
  const rows = shortageRows(request);
  return statResponse({
    total_emergency: flow(rows.filter((row) => row.statusCode === 'URGENT').length),
    total_warning: flow(rows.filter((row) => row.statusCode === 'CAUTION').length),
  });
};

/** 물류팀 재직 직원. 재고 이동 기록의 담당자 */
const LOGISTICS = EMPLOYEES.filter(
  (row) => row.department === '물류팀' && row.statusCode === 'ACTIVE',
);
const MOVEMENT_TYPES = ['IN', 'OUT', 'MOVE'] as const;
/**
 * 최근 재고 이동 기록. 품목표 앞 12개가 어제부터 하루 두 건씩 거슬러 간다(최근 것이 위). 그 로그인이 옮긴 기록이 맨 위에 온다.
 * 수량과 종류는 해시, verified=false
 */
const movementsOf = (request: Request) => {
  const today = todayKey();
  const seed = WAREHOUSE_ITEMS.slice(0, 12).map((item, i) => ({
    type: MOVEMENT_TYPES[i % MOVEMENT_TYPES.length],
    quantity: 10 + Math.floor(hashUnit(`move:${item.itemId}`) * 20) * 5,
    itemName: item.itemName,
    workDate: `${addDays(today, -1 - Math.floor(i / 2))}T${i % 2 ? '10' : '15'}:30:00`,
    managerName: LOGISTICS[i % LOGISTICS.length].name,
  }));
  const moved = inventoryState(request).transfers.map((row) => ({
    ...row,
    type: 'MOVE' as const,
    managerName: LOGISTICS[0].name,
  }));
  return [...moved, ...seed].map((row) => ({ ...row, uomName: 'EA' }));
};

/** 생산중, 출고 준비 상세. 품목 줄은 그 영업 주문의 줄이다 */
const shippingDetail = (
  request: Request,
  order: {
    salesOrderId: string;
    salesOrderNumber: string;
    customerName: string;
    dueDate: string;
    statusCode: string;
  },
) => ({
  salesOrderId: order.salesOrderId,
  salesOrderNumber: order.salesOrderNumber,
  customerCompanyName: order.customerName,
  dueDate: order.dueDate,
  statusCode: order.statusCode,
  orderItems: orderLinesOf(request, order.salesOrderId).map(({ itemId, itemName, quantity }) => ({
    itemId,
    itemName,
    quantity,
    uomName: 'EA',
  })),
});

export const inventoryHandlers = [
  // ----------------------- Inventory -----------------------
  http.get(INVENTORY_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load inventory stats', 500);
    return ok(inventoryStats(request));
  }),
  http.get(INVENTORY_ENDPOINTS.INVENTORY_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load inventory list', 500);
    const url = new URL(request.url);
    // 창고 3D(시각화 8)는 창고 목록의 이름 그대로 찾는다. 그 창고의 품목 14개(재고율 4단계와 기준 없음이 다 나온다).
    // 이름 일부나 다른 검색은 일반 재고 행에서 거른다(카드 "목 필터와 검색" 결정 7)
    const keyword = (url.searchParams.get('keyword') ?? '').trim();
    const byWarehouse =
      url.searchParams.get('type') === 'WAREHOUSE_NAME' &&
      WAREHOUSES.some((warehouse) => warehouse.warehouseName === keyword);
    const rows = byWarehouse ? warehouseStock(request, keyword) : inventoryRows(request);
    // 이름은 게이트웨이와 같다(ImController.java:36-41)
    return ok(
      paged(
        request,
        filterBy(request, rows, {
          equals: { statusCode: (row) => row.statusCode },
          search: {
            WAREHOUSE_NAME: (row) => row.warehouseName,
            ITEM_NAME: (row) => row.itemName,
          },
        }),
      ),
    );
  }),
  http.get<{ itemId: string }>(`${INVENTORY_BASE_PATH}/iv/items/:itemId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load inventory detail', 500);
    // 목록(일반, 안전재고, 창고별)의 품목은 품목표에서 찾는다. 품목표에 없으면 404(카드 "없는 건은 404")
    const item = catalogItem(params.itemId);
    if (!item) return notFound('재고 상세 조회');
    return ok({
      ...itemRow(request, item),
      supplierCompanyName: '대양상사',
      warehouseId: HOME.warehouseId,
      warehouseName: HOME.warehouseName,
      warehouseNumber: HOME.warehouseNumber,
      location: 'A-1',
      lastModified: isoNow,
      description: `${item.itemName} 표준 규격`,
      stockMovement: [
        {
          type: 'IN',
          quantity: 50,
          uomName: 'EA',
          from: '대양상사',
          to: HOME.warehouseName,
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
      content: shortageRows(request).map(
        ({ itemId, itemName, currentStock, safetyStock, uomName, statusCode }) => ({
          itemId,
          itemName,
          currentStock,
          safetyStock,
          uomName,
          statusCode,
        }),
      ),
    });
  }),
  http.get(INVENTORY_ENDPOINTS.RECENT_STOCK_MOVEMENT, ({ request }) => {
    if (shouldError(request)) return error('Failed to load stock movement', 500);
    return ok({ content: movementsOf(request) });
  }),
  http.post<PathParams, Schema<'StockMovementRequest'>>(
    INVENTORY_ENDPOINTS.RECENT_STOCK_MOVEMENT,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to post stock movement', 500);
      const { movedOut, transfers } = inventoryState(request);
      const { itemId, fromWarehouseId, toWarehouseId, stockQuantity } = await request.json();
      const direction =
        (fromWarehouseId === DETAIL_WAREHOUSE_ID ? 1 : 0) -
        (toWarehouseId === DETAIL_WAREHOUSE_ID ? 1 : 0);
      movedOut.set(itemId, (movedOut.get(itemId) ?? 0) + direction * stockQuantity);
      // 화면이 이동 기록을 다시 받는다(moveStock 무효화). 맨 위에 MOVE 한 줄(종류 값은 화면이 받는 값, verified=false).
      // 시각은 한국 시각 글자
      transfers.unshift({
        itemName: catalogItem(itemId)?.itemName ?? itemId,
        quantity: stockQuantity,
        workDate: new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 19),
      });
      // shortcut: 최근 이동 14건만 기억한다(서버리스 메모리 상한), 더 긴 이력이 필요하면 상한을 올린다
      transfers.splice(WAREHOUSE_ITEMS.length);
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
    return ok(paged(request, productionRows(request)));
  }),
  http.get(INVENTORY_ENDPOINTS.READY_TO_SHIP_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load ready-to-ship list', 500);
    return ok(paged(request, readyRows(request)));
  }),
  http.get(`${INVENTORY_BASE_PATH}/sales-orders/production/:itemId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load production detail', 500);
    const order = productionRows(request).find((row) => row.salesOrderId === params.itemId);
    if (!order) return notFound('생산중 주문 상세 조회');
    return ok(shippingDetail(request, order));
  }),
  http.get(`${INVENTORY_BASE_PATH}/sales-orders/ready-to-ship/:itemId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load shipping detail', 500);
    // 출고 준비 목록(배송을 시작하면 빠진다)에 없으면 404
    const order = readyRows(request).find((row) => row.salesOrderId === params.itemId);
    if (!order) return notFound('출고 준비 주문 상세 조회');
    return ok(shippingDetail(request, order));
  }),
  http.patch<{ orderId: string }>(
    `${INVENTORY_BASE_PATH}/sales-orders/:orderId/status`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to update shipping status', 500);
      // 출고 준비 주문을 배송중으로. 응답 모양은 게이트웨이 옛 목(ImController.java:537-553)
      const order = startShipping(request, params.orderId);
      return ok({
        salesOrderId: params.orderId,
        salesOrderCode: order?.salesOrderNumber ?? '',
        status: 'DELIVERING',
      });
    },
  ),
  http.get(INVENTORY_ENDPOINTS.PENDING_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load pending list', 500);
    return ok(paged(request, receivingRowsOf(request, 'DELIVERING')));
  }),
  http.get(INVENTORY_ENDPOINTS.RECEIVED_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load received list', 500);
    // 행에 입고일이 없어 납기로 거른다(verified=false, 카드 "목 필터와 검색" 결정 6)
    return ok(
      paged(
        request,
        filterBy(request, receivingRowsOf(request, 'DELIVERED'), { date: (row) => row.dueDate }),
      ),
    );
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
    return ok(lowStockStats(request));
  }),
  http.get(LOWSTOCK_ENDPOINTS.LOW_STOCK_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load low stock list', 500);
    return ok(
      paged(
        request,
        filterBy(request, shortageRows(request), {
          equals: { statusCode: (row) => row.statusCode },
        }),
      ),
    );
  }),
];
