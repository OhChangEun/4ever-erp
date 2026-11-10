/**
 * 재고 도메인의 공개 API. 다른 도메인은 여기서만 가져온다(everp/domain-boundary).
 * 창고, 안전재고, 생산 화면이 쓰는 키, 타입, 상수. 화면 컴포넌트는 ui.ts 에 둔다.
 */
export { inventoryKeys, warehouseInfoKeys } from './inventory.keys';
export { LOW_STOCK_STATUS_OPTIONS } from './inventory.constants';
export { useInventoryLabels } from './inventory.labels';
export type { InventoryResponse, InventoryQueryParams } from './types/InventoryListType';
export type { ItemResponse } from './types/ItemListType';
// 재고 메시지(i18n 6). 재고 모달을 여는 화면(창고, 안전재고)의 레이아웃이 감싼다.
// ui.ts 가 아니라 여기 두는 이유: ui.ts 를 정적으로 가져오면 모달까지 첫 로드에 딸려 온다(LowStockList 주석)
export { default as InventoryMessages } from './InventoryMessages';
