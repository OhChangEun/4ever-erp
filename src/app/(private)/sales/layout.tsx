import RouteProviders from '../_RouteProviders';
import SalesMessages from './SalesMessages';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다. 모달은 RouteProviders 안의 ModalProvider 가 그리므로, 안쪽에 두면 영업 모달이 영업 메시지를 못 본다
  return (
    <SalesMessages>
      <RouteProviders>{children}</RouteProviders>
    </SalesMessages>
  );
}
