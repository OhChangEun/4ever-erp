import type inventoryKo from '@/i18n/messages/inventory/ko.json';
import type lowStockKo from '@/i18n/messages/lowStock/ko.json';

// 글자는 메시지에 있다. 여기는 코드와 순서만(i18n 6)

// 재고 목록 검색 기준. 글자는 inventory.list.searchType.<코드>
export const INVENTORY_SEARCH_KEYWORD_OPTIONS = [
  'WAREHOUSE_NAME',
  'ITEM_NAME',
] as const satisfies readonly (keyof typeof inventoryKo.list.searchType)[];

// 재고 목록 상태 필터. 글자는 inventory.list.statusFilter.<코드>
export const INVENTORY_STATUS_OPTIONS = [
  'ALL',
  'NORMAL',
  'CAUTION',
  'URGENT',
] as const satisfies readonly (keyof typeof inventoryKo.list.statusFilter)[];

// 부족 재고 상태 필터(안전재고 화면). 글자는 lowStock.list.statusFilter.<코드>
export const LOW_STOCK_STATUS_OPTIONS = [
  'ALL',
  'CAUTION',
  'URGENT',
] as const satisfies readonly (keyof typeof lowStockKo.list.statusFilter)[];

// 원자재 창고 유형의 별칭. 응답 계약이 string 이라 MATERIAL 대신 올 수 있다(목 응답이 RAW).
// 표시 라벨(inventory.labels.ts)과 창고 수정 폼의 요청 코드 변환(warehouse.constants.ts)이 같이 쓴다
export const WAREHOUSE_MATERIAL_ALIASES: readonly string[] = ['RAW', 'RAW_MATERIAL'];
