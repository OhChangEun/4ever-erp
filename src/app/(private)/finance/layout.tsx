import RouteProviders from '../_RouteProviders';
import FinanceMessages from './FinanceMessages';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  // 메시지가 바깥이어야 한다. 모달은 RouteProviders 안의 ModalProvider 가 그리므로, 안쪽에 두면 전표 상세 모달이 재무 메시지를 못 본다
  return (
    <FinanceMessages>
      <RouteProviders>{children}</RouteProviders>
    </FinanceMessages>
  );
}
