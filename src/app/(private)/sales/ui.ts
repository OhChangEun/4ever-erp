/**
 * 영업 도메인의 공개 화면 컴포넌트. 대시보드의 수주 등록 모달.
 * index.ts 와 나눠 키만 쓰는 도메인(재고)이 모달을 받지 않게 한다.
 */
export { default as NewOrderModal } from './components/modals/NewOrderModal';
// 영업 메시지(i18n 8). 수주 등록 모달을 여는 대시보드 레이아웃이 감싼다.
// index.ts 가 아니라 여기 두는 이유: 재고가 index.ts 에서 키를 가져오므로, 거기 두면 재고 화면 첫 로드에 영업 메시지가 딸려 간다
export { default as SalesMessages } from './SalesMessages';
