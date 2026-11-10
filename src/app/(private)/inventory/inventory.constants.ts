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
