/**
 * 재고 도메인의 공개 API. 다른 도메인은 여기서만 가져온다(everp/domain-boundary).
 * 창고, 안전재고, 생산 화면이 쓰는 키, 타입, 상수. 화면 컴포넌트는 ui.ts 에 둔다.
 */
export {
  inventoryKeys,
  inventoryStatsKeys,
  receivingKeys,
  shippingKeys,
  warehouseInfoKeys,
} from './inventory.keys';
export { LOW_STOCK_STATUS_OPTIONS, WAREHOUSE_MATERIAL_ALIASES } from './inventory.constants';
export { useInventoryLabels } from './inventory.labels';
export type { InventoryResponse, InventoryQueryParams } from './types/InventoryListType';
export type { ItemResponse } from './types/ItemListType';
// 재고 메시지 감싸개는 messages.ts 에 있다. 여기 두면 키만 쓰는 구매, 영업에도 메시지 JSON 이 딸려 온다
