/**
 * 안전재고 도메인의 공개 API. 다른 도메인은 여기서만 가져온다(everp/domain-boundary).
 * 재고 화면의 부족 재고 목록과 그 무효화 키.
 */
export { lowStockKeys, lowStockStatsKeys } from './lowStock.keys';
export type { LowStockItemResponse } from './types/LowStockAlertType';
