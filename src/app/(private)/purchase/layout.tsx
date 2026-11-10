import RouteProviders from '../_RouteProviders';
import PurchaseMessages from './PurchaseMessages';

export default function PurchaseLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다. 모달은 RouteProviders 안의 ModalProvider 가 그리므로, 안쪽에 두면 구매에서 연 모달이 구매 메시지를 못 본다
  return (
    <PurchaseMessages>
      <RouteProviders>{children}</RouteProviders>
    </PurchaseMessages>
  );
}
