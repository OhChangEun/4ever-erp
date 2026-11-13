import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { IntlTestProvider, renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import WarehouseList from './warehouse/components/WarehouseList';
import AvailableProgramTab from './hrm/components/tabs/subTab/trainingTab/AvailableProgramTab';
import NotificationList from '@/app/components/header/Notification/NotificationList';
import AppError from '@/app/error';
import PrivateError from './error';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

/**
 * 남은 접근성과 디자인 카드. 지침 12장 "아이콘은 사이드바 메뉴, 입력 접두사, 모달 닫기와 드롭다운 화살표 세 곳".
 * 아이콘이 뜻을 전하던 곳은 글자로 대신한다(이름 칸 + 값 칸).
 */
const icons = (root: HTMLElement) => root.querySelectorAll('[class*="ri-"]');

describe('카드 행은 아이콘 대신 이름과 값', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
  });

  it('창고 카드: 유형, 위치, 담당자, 연락처가 글자 이름으로 보이고 아이콘이 없다', async () => {
    useAuthStore
      .getState()
      .setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role: 'IM_USER' });
    renderWithProviders(<WarehouseList />);
    const cards = await screen.findAllByRole('listitem');
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(
        within(card)
          .getAllByRole('term')
          .map((term) => term.textContent),
      ).toEqual(['창고 유형', '위치', '담당자', '연락처']);
      expect(within(card).getAllByRole('definition')).toHaveLength(4);
      expect(icons(card)).toHaveLength(0);
      // 카드 동작 셋은 그대로 버튼(모달을 연다)
      for (const name of ['상세보기', '3D 보기', '관리'])
        expect(within(card).getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('교육 프로그램 카드: 교육 시간, 교육 방식, 정원이 글자 이름으로 보이고 아이콘이 없다', async () => {
    renderWithProviders(<AvailableProgramTab />);
    const cards = await screen.findAllByRole('listitem');
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(
        within(card)
          .getAllByRole('term')
          .map((term) => term.textContent),
      ).toEqual(['교육 시간', '교육 방식', '정원']);
      expect(within(card).getAllByRole('definition')).toHaveLength(3);
      expect(icons(card)).toHaveLength(0);
    }
  });
});

describe('알림 목록 출처', () => {
  it('출처는 회색 글자 하나로만 보이고 색 아이콘 타일이 없다', () => {
    const base = {
      notificationTitle: '제목',
      notificationMessage: '내용',
      createdAt: '2026-11-12T09:05:00',
      isRead: false,
    };
    render(
      <NotificationList
        notifications={[
          { ...base, notificationId: 'n1', source: 'FCM' },
          { ...base, notificationId: 'n2', source: 'PP' },
          { ...base, notificationId: 'n3', source: 'QA' },
        ]}
        onNotificationClick={() => {}}
      />,
      { wrapper: IntlTestProvider },
    );
    const rows = screen.getAllByRole('listitem');
    expect(
      rows.map((row) => within(row).getByText(/^(재무|생산|알 수 없음)$/).textContent),
    ).toEqual(['재무', '생산', '알 수 없음']);
    for (const row of rows) expect(icons(row)).toHaveLength(0);
  });
});

describe('오류 화면 버튼', () => {
  it('앱 오류 화면의 다시 시도, 홈으로, 복사 버튼에 아이콘이 없다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<AppError error={new Error('x')} retry={() => {}} />, { wrapper: IntlTestProvider });
    for (const name of ['다시 시도', '홈으로', '오류 내용 복사'])
      expect(icons(screen.getByRole('button', { name }))).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it('화면 오류의 다시 시도 버튼에 아이콘이 없다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PrivateError error={new Error('x')} retry={() => {}} />, {
      wrapper: IntlTestProvider,
    });
    expect(icons(screen.getByRole('button', { name: '다시 시도' }))).toHaveLength(0);
    vi.restoreAllMocks();
  });
});
