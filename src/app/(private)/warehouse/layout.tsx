import RouteProviders from '../_RouteProviders';
import WarehouseMessages from './WarehouseMessages';

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다. 모달은 RouteProviders 안의 ModalProvider 가 그리므로, 안쪽에 두면 창고 모달이 창고 메시지를 못 본다
  return (
    <WarehouseMessages>
      <RouteProviders>{children}</RouteProviders>
    </WarehouseMessages>
  );
}
