/**
 * 재고 도메인의 공개 API. 다른 도메인은 여기서만 가져온다(everp/domain-boundary).
 * 창고, 안전재고, 생산 화면이 쓰는 키, 타입, 상수. 화면 컴포넌트는 ui.ts 에 둔다.
 */
export { warehouseInfoKeys } from './inventory.keys';
export { LOW_STOCK_STATUS_OPTIONS } from './inventory.constants';
export type { InventoryResponse } from './types/InventoryListType';
export type { ItemResponse } from './types/ItemListType';
