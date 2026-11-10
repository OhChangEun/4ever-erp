import RouteProviders from '../_RouteProviders';
import InventoryMessages from './InventoryMessages';

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다. 모달은 RouteProviders 안의 ModalProvider 가 그리므로, 안쪽에 두면 재고 모달이 재고 메시지를 못 본다
  return (
    <InventoryMessages>
      <RouteProviders>{children}</RouteProviders>
    </InventoryMessages>
  );
}
