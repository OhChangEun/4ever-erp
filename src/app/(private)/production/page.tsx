import ProductionClient from './ProductionClient';

export default function ProductionPage() {
  // 서버 전용 env. 실백엔드면 BOM 상태 버튼을 숨긴다(BomStatusActionsContext).
  // shortcut: 이 페이지는 정적(○)이라 값이 build 때 굳는다, build 와 실행 env 가 다르게 되면 동적으로 바꾼다
  return <ProductionClient realBackend={Boolean(process.env.BACKEND_API_URL)} />;
}
