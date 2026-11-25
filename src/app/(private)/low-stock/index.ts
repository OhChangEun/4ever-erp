/**
 * 안전재고 도메인의 공개 API. 다른 도메인은 여기서만 가져온다(everp/domain-boundary).
 * 안전재고 화면에서 여는 구매 요청 모달(재고 도메인)이 무효화하는 목록 키와 재고 화면의 부족 재고 목록 타입.
 */
export { lowStockKeys } from './lowStock.keys';
export type { LowStockItemResponse } from './types/LowStockAlertType';
