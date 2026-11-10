import RouteProviders from '../_RouteProviders';
import ProductionMessages from './ProductionMessages';

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다. 모달은 RouteProviders 안의 ModalProvider 가 그리므로, 안쪽에 두면 생산 모달이 생산 메시지를 못 본다
  return (
    <ProductionMessages>
      <RouteProviders>{children}</RouteProviders>
    </ProductionMessages>
  );
}
