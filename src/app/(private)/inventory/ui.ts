/**
 * 재고 도메인의 공개 화면 컴포넌트. index.ts 와 나눈 이유는 키나 타입만 쓰는 도메인(창고)이
 * 모달과 그 의존(구매 api, zod)까지 받지 않게 하려는 것(커스텀 ESLint 규칙 카드, 창고 첫 로드 +21.7KB 였음).
 */
export { default as InventoryPurchaseRequestModal } from './components/modals/InventoryPurchaseRequestModal';
export { default as InventoryDetailModal } from './components/modals/InventoryDetailModal';
// api 함수도 여기서 연다. index.ts 에 두면 키나 상수만 쓰는 화면(안전재고, 창고 목록)이
// 재고 api 전체를 첫 로드에 받는다(시각화 8 뒤 /low-stock +5.0KB, CI 번들 표)
export { getInventoryList } from './inventory.api';
