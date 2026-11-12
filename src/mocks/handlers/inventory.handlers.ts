import { http, type PathParams } from 'msw';
import { INVENTORY_BASE_PATH, INVENTORY_ENDPOINTS, LOWSTOCK_ENDPOINTS } from '@/app/types/api';
import type { Schema } from '@/lib/api/contract';
import { mockState } from '../state';
import {
  ok,
  okNoData,
  error,
  shouldError,
  pathSegment,
  isoNow,
  makePage,
  stat,
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
const UNIT_PRICE = 12000;

/** 품목의 안전재고와 현재고에 쓰기 결과를 덮는다 */
const stockOf = (request: Request, itemId: string, seed: { current: number; safety: number }) => {
  const state = inventoryState(request);
  return {
    currentStock: seed.current - (state.movedOut.get(itemId) ?? 0),
    safetyStock: state.safetyStock.get(itemId) ?? seed.safety,
  };
};

const mockInventoryStats = statResponse({
  total_stock: stat,
  store_complete: stat,
  store_pending: stat,
  delivery_complete: stat,
  delivery_pending: stat,
});

const mockLowStockStats = statResponse({
  total_emergency: stat,
  total_warning: stat,
});

/** 창고 하나의 재고(시각화 8). 값은 순번으로 정해진다. 안전재고 대비 30%~420%, 하나는 안전재고 0 */
const WAREHOUSE_ITEMS = [
  '모터 A',
  '베어링 B',
  '볼트 M6',
  '알루미늄 판',
  '구리선',
  '샤프트',
  '커버',
  '패킹',
  '너트 M6',
  '와셔',
  '하우징',
  '기어',
  '스프링',
  '케이블',
];
const warehouseStock = (warehouseName: string) =>
  WAREHOUSE_ITEMS.map((itemName, i) => {
    const safetyStock = i === 13 ? 0 : 50 + (i % 4) * 25;
    const ratio = [0.3, 0.8, 1.1, 1.3, 1.8, 2.4, 3.5, 4.2][i % 8];
    const currentStock = Math.round((safetyStock || 40) * ratio);
    return {
      itemId: i === 0 ? 'item-1001' : `item-wh-${String(i + 1).padStart(3, '0')}`,
      itemNumber: `ITM-${String(3000 + i)}`,
      itemName,
      category: '자재',
      currentStock,
      forShipmentStock: 0,
      reservedStock: 0,
      safetyStock,
      uomName: 'EA',
      unitPrice: 1000 + i * 150,
      totalAmount: currentStock * (1000 + i * 150),
      warehouseName,
      warehouseType: 'RAW',
      statusCode: currentStock < safetyStock ? 'URGENT' : 'NORMAL',
      shelfNumber: i + 1,
    };
  });

export const inventoryHandlers = [
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
    // 창고 3D(시각화 8)는 창고 이름으로 거른다. 그 창고의 품목 14개(재고율 4단계와 기준 없음이 다 나온다)
    const keyword = url.searchParams.get('keyword');
    if (url.searchParams.get('type') === 'WAREHOUSE_NAME' && keyword) {
      const content = warehouseStock(keyword);
      return ok({ content: content.slice(0, size), page: makePage(page, size, content.length) });
    }
    const stock = stockOf(request, 'item-1001', { current: 120, safety: 50 });
    return ok({
      content: [
        {
          itemId: 'item-1001',
          itemNumber: 'ITM-1001',
          itemName: '모터 A',
          category: 'MOTOR',
          ...stock,
          forShipmentStock: 30,
          reservedStock: 10,
          uomName: 'EA',
          unitPrice: UNIT_PRICE,
          totalAmount: stock.currentStock * UNIT_PRICE,
          warehouseName: '1공장 창고',
          warehouseType: 'RAW',
          statusCode: 'NORMAL',
          shelfNumber: 12,
        },
      ],
      page: makePage(page, size, 1),
    });
  }),
  http.get<{ itemId: string }>(`${INVENTORY_BASE_PATH}/iv/items/:itemId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load inventory detail', 500);
    const stock = stockOf(request, params.itemId, { current: 120, safety: 50 });
    return ok({
      itemId: params.itemId,
      itemNumber: 'ITM-1001',
      itemName: '모터 A',
      category: 'MOTOR',
      supplierCompanyName: '대양상사',
      statusCode: 'NORMAL',
      ...stock,
      uomName: 'EA',
      unitPrice: UNIT_PRICE,
      totalAmount: stock.currentStock * UNIT_PRICE,
      warehouseId: DETAIL_WAREHOUSE_ID,
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
          ...stockOf(request, 'item-1002', { current: 20, safety: 50 }),
          uomName: 'EA',
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
    // 주소가 .../iv/items/{id}/safety-stock?safetyStock=N
    const safetyStock = Number(new URL(request.url).searchParams.get('safetyStock'));
    if (Number.isFinite(safetyStock))
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
          // 계약 enum 이 PRODUCTION 이다. 메시지 키가 없어 화면엔 "알 수 없음"(카드 "목이 쓰기 결과를 따르게" 별도 보고)
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
    // 배송을 시작한 주문은 배송중이 되어 이 목록에서 빠진다(게이트웨이 OrderController.java:239)
    const content = [
      {
        salesOrderId: 'so-002',
        salesOrderNumber: 'SO-2026-002',
        customerName: '미래전자',
        orderDate: '2026-01-10',
        dueDate: '2026-02-02',
        productionCompletionDate: '2026-01-25',
        readyToShipDate: '2026-01-26',
        totalAmount: 5200000,
        // 오타지만 계약 enum 이 이 값이다. 계약을 고칠 때 같이 고친다(같은 카드 별도 보고)
        statusCode: 'READT_TO_SHIP',
      },
    ].filter((order) => !inventoryState(request).shippedOrders.has(order.salesOrderId));
    return ok({ content, page: makePage(page, size, content.length) });
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
          ...stockOf(request, 'item-1002', { current: 20, safety: 50 }),
          uomName: 'EA',
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
];
