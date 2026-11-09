/**
 * 구매 도메인의 공개 API. 다른 도메인은 여기서만 가져온다(everp/domain-boundary).
 * 다른 도메인이 실제로 쓰는 것만 내보낸다. 재고, 생산 화면의 구매 요청 생성과 그 무효화 키.
 */
export { createStockPurchaseRequest } from './api/purchase.api';
export { purchaseRequestKeys, purchaseStatsKeys } from './api/purchase.keys';
export type {
  CreateStockPurchaseRequestBody,
  CreateStockPurchaseRequestItem,
} from './types/PurchaseRequestType';
