import RouteProviders from '../_RouteProviders';
import { InventoryMessages } from '@/app/(private)/inventory';
import WarehouseMessages from './WarehouseMessages';

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다. 모달은 RouteProviders 안의 ModalProvider 가 그리므로, 안쪽에 두면 창고 모달이 창고 메시지를 못 본다.
  // 재고 메시지도 감싼다. 3D 패널에서 여는 재고 상세(재고 추이 포함)는 재고 화면 컴포넌트(inventory/ui)다
  return (
    <WarehouseMessages>
      <InventoryMessages>
        <RouteProviders>{children}</RouteProviders>
      </InventoryMessages>
    </WarehouseMessages>
  );
}
