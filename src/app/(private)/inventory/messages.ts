/**
 * 재고 메시지(i18n 6) 공개 입구. 재고 모달을 여는 화면(창고, 안전재고)의 레이아웃이 감싼다.
 * ui.ts 가 아니라 따로 두는 이유: ui.ts 를 정적으로 가져오면 모달까지 첫 로드에 딸려 온다(LowStockList 주석).
 * index.ts 가 아니라 따로 두는 이유: 메시지 JSON 이 키만 쓰는 도메인(구매, 영업)의 첫 로드에 딸려 온다
 */
export { default as InventoryMessages } from './InventoryMessages';
