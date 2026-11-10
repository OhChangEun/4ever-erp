import RouteProviders from '../_RouteProviders';
import HrmMessages from './HrmMessages';

export default function HrmLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다. 모달은 RouteProviders 안의 ModalProvider 가 그리므로, 안쪽에 두면 인사 모달이 인사 메시지를 못 본다
  return (
    <HrmMessages>
      <RouteProviders>{children}</RouteProviders>
    </HrmMessages>
  );
}
