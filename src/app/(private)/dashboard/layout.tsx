import RouteProviders from '../_RouteProviders';
import { SalesMessages } from '@/app/(private)/sales/ui';
import DashboardMessages from './DashboardMessages';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다. 모달은 RouteProviders 안의 ModalProvider 가 그리므로, 안쪽에 두면 대시보드에서 연 모달이 대시보드 메시지를 못 본다.
  // 영업 메시지도 감싼다. 빠른 작업의 견적 요청은 영업 화면 모달(sales/ui 의 NewOrderModal)이다. 대시보드는 이미 sales/ui 를 가져와 더 받는 것은 메시지뿐
  return (
    <DashboardMessages>
      <SalesMessages>
        <RouteProviders>{children}</RouteProviders>
      </SalesMessages>
    </DashboardMessages>
  );
}
