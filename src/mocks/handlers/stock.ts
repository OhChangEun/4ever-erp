import { addCreated, mockState } from '../state';
import { WAREHOUSE_ITEMS, catalogItem, type CatalogItem } from './catalog';
import { EMPLOYEES, SUPPLIERS, WAREHOUSES, addDays, todayKey } from './seed';

/** 재고 이동 기록 한 줄. 최근 재고 이동 목록과 재고 상세의 이동 내역이 같은 줄에서 나온다 */
interface StockMove {
  itemId: string;
  itemName: string;
  type: 'IN' | 'OUT' | 'MOVE';
  quantity: number;
  from: string;
  to: string;
  /** 한국 시각 글자 */
  workDate: string;
  managerName: string;
  referenceNumber: string;
  note: string;
}

/** 재고에 있는 품목과 보관 창고 */
interface Stocked {
  item: CatalogItem;
  warehouse: (typeof WAREHOUSES)[number];
}

/**
 * 재고 목이 기억하는 쓰기 결과(로그인별, `src/mocks/state.ts`)와 그 위에 계산한 현재고, 재고 이동 기록.
 * 재고, 영업(견적 재고 확인), 생산(MRP, MPS), 재고 추이 목이 같이 읽는다. 핸들러 파일끼리 서로 부르지 않게 따로 둔다
 * (재고 목이 영업 주문을 읽고 영업 목이 재고를 읽는다).
 * 안전재고 수정과 재고 이동은 화면이 응답 전에 값을 바꾼다(낙관적). 목이 안 따르면 다시 가져올 때 원래 값으로 돌아간다
 */
export const inventoryState = mockState<{
  safetyStock: Map<string, number>;
  /**
   * 품목 id → 한국 날짜 → 그날 이동과 원자재 추가로 보관 창고 재고가 변한 수량. 현재고와 재고 추이가 같이 읽는다.
   * 아래 이동 기록은 최근 것만 남지만 이 값은 전부 남아 오래된 기록이 밀려나도 지난 날의 재고가 안 바뀐다
   */
  dailyChange: Map<string, Map<string, number>>;
  /** 그 로그인이 보낸 재고 이동 기록. 최근 것이 앞 */
  transfers: StockMove[];
  /** 그 로그인이 원자재 추가로 넣은 자재와 보관 창고. 수량은 dailyChange, 안전재고는 safetyStock 에 있다 */
  added: Stocked[];
  /** 씨앗 이동 기록과 재고 추이를 세는 날. 그 로그인이 재고 목을 처음 부른 날이고 그 뒤로 안 바뀐다(자정이 지나도 지난 재고가 그대로) */
  movesFrom: string;
}>(() => ({
  safetyStock: new Map(),
  dailyChange: new Map(),
  transfers: [],
  added: [],
  movesFrom: todayKey(),
}));

/** 품목표 14개의 보관 창고(1공장 창고 wh-001) */
const HOME = WAREHOUSES[0];
/** 그 로그인의 재고. 품목표 14개와 원자재 추가로 넣은 자재. 재고 이동은 보관 창고에서 나가거나 들어올 때만 현재고가 바뀐다 */
export const stockedOf = (request: Request): Stocked[] => [
  ...WAREHOUSE_ITEMS.map((item) => ({ item, warehouse: HOME })),
  ...inventoryState(request).added,
];
export const stockedItem = (request: Request, itemId: string) =>
  stockedOf(request).find(({ item }) => item.itemId === itemId);
/** 원자재 추가로 넣은 자재인가(추가하기 전에는 재고가 없었다) */
export const isAdded = (request: Request, itemId: string) =>
  inventoryState(request).added.some(({ item }) => item.itemId === itemId);

/** 품목의 그날(한국 날짜) 재고 변화에 더한다 */
const addChange = (request: Request, itemId: string, day: string, quantity: number) => {
  const { dailyChange } = inventoryState(request);
  const byDay = dailyChange.get(itemId) ?? new Map<string, number>();
  byDay.set(day, (byDay.get(day) ?? 0) + quantity);
  dailyChange.set(itemId, byDay);
};

/** 원자재 추가 쓰기. 처음 수량은 오늘 생긴 재고다(이동 기록은 남기지 않는다. 화면도 이동 목록을 다시 받지 않는다) */
export const recordMaterial = (
  request: Request,
  { item, warehouse }: Stocked,
  quantity: number,
  safetyStock: number,
) => {
  const state = inventoryState(request);
  addCreated(state.added, () => ({ item, warehouse }));
  state.safetyStock.set(item.itemId, safetyStock);
  addChange(request, item.itemId, todayKey(), quantity);
};

/** 품목의 공급사. 품목마다 다른 공급사를 아는 표가 없어 모두 대양상사다(재고 상세, 품목 선택, 자재 목록, 입고 기록) */
export const ITEM_SUPPLIER = SUPPLIERS[0].supplierInfo;

/** 그 로그인의 이동으로 변한 재고. date 를 주면 그날 뒤의 것만 */
const transferredAfter = (request: Request, itemId: string, date = '') =>
  [...(inventoryState(request).dailyChange.get(itemId) ?? [])]
    .filter(([day]) => day > date)
    .reduce((sum, [, change]) => sum + change, 0);

/** 품목표의 처음 재고에 쓰기 결과를 덮는다. 같은 품목은 어느 조회에서나(재고 추이, 견적 재고 확인, MRP 포함) 같은 수량이다 */
export const stockOf = (request: Request, item: CatalogItem) => {
  const state = inventoryState(request);
  return {
    currentStock: item.current + transferredAfter(request, item.itemId),
    safetyStock: state.safetyStock.get(item.itemId) ?? item.safety,
  };
};

/** 품목 id 의 현재고. 품목표에 없는 품목은 0. 영업의 재고 확인과 생산의 시뮬레이션이 같이 읽는다 */
export const onHand = (request: Request, itemId: string) => {
  const item = catalogItem(itemId);
  return item ? stockOf(request, item).currentStock : 0;
};

/**
 * 재고 상태. 안전재고의 절반 미만 URGENT, 안전재고 미만 CAUTION, 그 밖 NORMAL.
 * 게이트웨이 옛 목 규칙(mockdata ImController.java:669-671, :762). 실서버 기준은 모른다(verified=false)
 */
export const stockStatus = ({ currentStock, safetyStock }: ReturnType<typeof stockOf>) =>
  currentStock < safetyStock * 0.5 ? 'URGENT' : currentStock < safetyStock ? 'CAUTION' : 'NORMAL';

/** 물류팀 재직 직원. 재고 이동 기록의 담당자 */
const LOGISTICS = EMPLOYEES.filter(
  (row) => row.department === '물류팀' && row.statusCode === 'ACTIVE',
);
const MOVEMENT_TYPES = ['IN', 'OUT', 'MOVE'] as const;
/**
 * 씨앗 이동 기록 12건. 품목표 앞 12개가 그 로그인의 첫날(movesFrom) 전날부터 하루 두 건씩 거슬러 간다. 수량은 처음 재고의 10%를 5개 단위로 반올림(최소 5).
 * 재고보다 많이 들어온 입고가 있으면 이동 전 재고가 음수가 되어 현재고와 어긋난다. 이동은 1공장 제품 창고로 나간 것이다.
 * 출고가 어디로 갔는지는 모른다(빈 글자, 게이트웨이 옛 목은 null, mockdata ImController.java:437). 참조 번호는 게이트웨이 옛 목의
 * `TR-` 에 날짜와 품목 번호를 붙였다. 종류, 수량, 번호 규칙은 verified=false
 */
const seedMoves = (request: Request): StockMove[] => {
  const { movesFrom } = inventoryState(request);
  return WAREHOUSE_ITEMS.slice(0, 12).map((item, i) => {
    const type = MOVEMENT_TYPES[i % MOVEMENT_TYPES.length];
    const quantity = Math.max(5, Math.round(item.current / 50) * 5);
    const date = addDays(movesFrom, -1 - Math.floor(i / 2));
    return {
      itemId: item.itemId,
      itemName: item.itemName,
      type,
      quantity,
      from: type === 'IN' ? ITEM_SUPPLIER.supplierName : HOME.warehouseName,
      to: { IN: HOME.warehouseName, OUT: '', MOVE: WAREHOUSES[1].warehouseName }[type],
      workDate: `${date}T${i % 2 ? '10' : '15'}:30:00`,
      managerName: LOGISTICS[i % LOGISTICS.length].name,
      referenceNumber: `TR-${date.replace(/-/g, '')}-${item.itemNumber.slice('ITM-'.length)}`,
      note: '',
    };
  });
};

/** 최근 재고 이동 기록(최근 것이 위). 씨앗 12건과 그 로그인이 옮긴 기록. 옮긴 기록은 새것부터라 같은 시각이면 나중 것이 위다 */
export const movesOf = (request: Request) =>
  [...inventoryState(request).transfers, ...seedMoves(request)].sort((a, b) =>
    b.workDate.localeCompare(a.workDate),
  );

/** date 뒤에 씨앗과 그 로그인의 이동으로 변한 재고. 재고 추이가 그날 끝의 재고를 되돌려 구한다 */
export const changeAfter = (request: Request, itemId: string, date: string) =>
  seedMoves(request)
    .filter((move) => move.itemId === itemId && move.workDate.slice(0, 10) > date)
    .reduce((sum, move) => sum + (move.type === 'IN' ? move.quantity : -move.quantity), 0) +
  transferredAfter(request, itemId, date);

const warehouseName = (warehouseId: string) =>
  WAREHOUSES.find((row) => row.warehouseId === warehouseId)?.warehouseName ?? warehouseId;

/** 재고 이동 쓰기. 현재고를 바꾸고 이동 기록 맨 위에 MOVE 한 줄을 더한다(종류 값은 화면이 받는 값, verified=false) */
export const recordTransfer = (
  request: Request,
  body: {
    itemId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    stockQuantity: number;
    reason: string;
  },
) => {
  const { transfers } = inventoryState(request);
  const { itemId, fromWarehouseId, toWarehouseId, stockQuantity } = body;
  const { warehouseId: home } = stockedItem(request, itemId)?.warehouse ?? HOME;
  const direction = (toWarehouseId === home ? 1 : 0) - (fromWarehouseId === home ? 1 : 0);
  // 기록의 시각과 재고를 빼는 날이 같은 순간에서 나온다(자정에 갈리지 않게)
  const workDate = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 19);
  const today = workDate.slice(0, 10);
  addChange(request, itemId, today, direction * stockQuantity);
  // 씨앗의 네 자리 품목 번호와 겹치지 않는 세 자리 순번. 오래된 것이 밀려나도 맨 앞 기록의 다음 번호다
  const serial = Number(transfers.at(0)?.referenceNumber.slice(-3) ?? 0) + 1;
  transfers.unshift({
    itemId,
    itemName: catalogItem(itemId)?.itemName ?? itemId,
    type: 'MOVE',
    quantity: stockQuantity,
    from: warehouseName(fromWarehouseId),
    to: warehouseName(toWarehouseId),
    workDate,
    managerName: LOGISTICS[0].name,
    referenceNumber: `TR-${today.replace(/-/g, '')}-${String(serial).padStart(3, '0')}`,
    note: body.reason,
  });
  // 기록은 최근 14건만 보인다(서버리스 메모리 상한). 재고 계산은 dailyChange 가 전부 기억한다
  transfers.splice(WAREHOUSE_ITEMS.length);
};
