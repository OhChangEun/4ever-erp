import RouteProviders from '../_RouteProviders';
import DashboardMessages from './DashboardMessages';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다. 모달은 RouteProviders 안의 ModalProvider 가 그리므로, 안쪽에 두면 대시보드에서 연 모달이 대시보드 메시지를 못 본다
  return (
    <DashboardMessages>
      <RouteProviders>{children}</RouteProviders>
    </DashboardMessages>
  );
}
