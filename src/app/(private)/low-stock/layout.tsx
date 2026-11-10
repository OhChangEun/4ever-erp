import RouteProviders from '../_RouteProviders';
import { InventoryMessages } from '@/app/(private)/inventory';
import LowStockMessages from './LowStockMessages';

export default function LowStockLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다(모달은 RouteProviders 안의 ModalProvider 가 그린다).
  // 재고 메시지도 감싼다. 여기서 여는 발주 요청 모달은 재고 화면 컴포넌트(inventory/ui)다
  return (
    <InventoryMessages>
      <LowStockMessages>
        <RouteProviders>{children}</RouteProviders>
      </LowStockMessages>
    </InventoryMessages>
  );
}
