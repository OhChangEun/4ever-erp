import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import { DEMO_ACCOUNTS } from '@/lib/auth/simpleLogin';
import NotificationList from './header/Notification/NotificationList';
import ProfileInfoModal from './header/ProfileInfoModal';
import EmployeeRegisterModal from '@/app/(private)/hrm/components/modals/EmployeeRegisterModal';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

afterEach(() => useAuthStore.getState().clearUserInfo());

describe('공통 화면 결함', () => {
  it('알림 출처 FCM 은 재무(백엔드 알림 서비스의 FCM = 재무부)', () => {
    renderWithProviders(
      <NotificationList
        notifications={[
          {
            notificationId: 'n-1',
            notificationTitle: '전표 승인',
            notificationMessage: '전표가 승인되었습니다',
            source: 'FCM',
            isRead: false,
            createdAt: '2026-11-10T09:00:00',
            linkId: 'x',
            linkType: 'VOUCHER',
          },
        ]}
        onNotificationClick={vi.fn()}
      />,
    );
    expect(screen.getByText('재무')).toBeInTheDocument();
    expect(screen.queryByText('시설')).not.toBeInTheDocument();
  });

  it('데모 계정 mm_admin 은 구매(MM) 관리자로 보인다', () => {
    const mm = DEMO_ACCOUNTS.find((a) => a.loginId === 'mm_admin');
    expect(mm).toMatchObject({
      role: 'MM_ADMIN',
      displayName: '구매 관리자',
      department: '구매팀',
    });
  });

  it('공급사로 로그인하면 프로필 모달 제목이 공급사 프로필', async () => {
    useAuthStore.getState().setUserInfo({
      id: 1,
      name: 'sup',
      email: 's@everp.local',
      role: 'SUPPLIER_ADMIN',
    });
    renderWithProviders(<ProfileInfoModal setIsOpen={vi.fn()} />);
    expect(await screen.findByText('공급사 프로필')).toBeInTheDocument();
    expect(screen.queryByText('고객사 프로필')).not.toBeInTheDocument();
  });

  it('고객사로 로그인하면 고객사 프로필(예전과 같음)', async () => {
    useAuthStore.getState().setUserInfo({
      id: 1,
      name: 'cus',
      email: 'c@everp.local',
      role: 'CUSTOMER_ADMIN',
    });
    renderWithProviders(<ProfileInfoModal setIsOpen={vi.fn()} />);
    expect(await screen.findByText('고객사 프로필')).toBeInTheDocument();
  });

  it("직원 등록의 부서 선택지에 '전체'가 없다(서버에 ALL 부서로 등록되지 않게)", async () => {
    renderWithProviders(<EmployeeRegisterModal id="m" onClose={vi.fn()} />);
    const combos = await screen.findAllByRole('combobox');
    await userEvent.click(combos[0]);
    expect(await screen.findAllByRole('option')).not.toHaveLength(0);
    expect(screen.queryByRole('option', { name: '전체' })).not.toBeInTheDocument();
  });
});
