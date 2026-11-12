import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';
import { renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/i18n/messages/en.json';
import ko from '@/i18n/messages/ko.json';
import type { Locale } from '@/i18n/locale';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import type { StatCardType } from '@/app/types/StatType';
import type { NotificationData } from './header/types/NotificationApiType';
import Sidebar from './sidebar/Sidebar';
import Navigation from './header/Navigation';
import NotificationHeader from './header/Notification/NotificationHeader';
import NotificationList from './header/Notification/NotificationList';
import StatSection from './common/StatSection';
import CalendarButton from './common/CalendarButton';
import DateRangePicker from './common/DateRangePicker';
import TableStatusBox from './common/TableStatusBox';
import ModalContainer from './common/modal/ModalContainer';
import { useToast } from './common/toast/useToast';
import { useDropdown } from '@/app/hooks/useDropdown';
import { createStatCard } from '@/lib/CreateStatCard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/sales',
}));

const loginAs = (role: string) =>
  useAuthStore.getState().setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role });

const notification = (source: NotificationData['source']): NotificationData => ({
  notificationId: source,
  notificationTitle: `title-${source}`,
  notificationMessage: 'message',
  source,
  linkId: '1',
  linkType: 'PR',
  isRead: false,
  createdAt: '2026-11-10T09:05:00',
});

const stat: StatCardType = createStatCard('Revenue', 1200, 0.12, '₩', [1, 2, 3]);
const statsData = { week: [stat], month: [stat], quarter: [stat], year: [stat] };

function ToastTrigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.success('Saved.')}>
      show
    </button>
  );
}

const dropdownWrapper = (locale: Locale) => {
  const client = createTestQueryClient();
  function DropdownWrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : ko}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  }
  return DropdownWrapper;
};

describe('공통 화면 영어(i18n 10)', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
    useSidebarStore.getState().setExpanded(true);
  });

  it('사이드바: 접기 버튼, 메뉴 열기, 부서 역할이 영어', () => {
    loginAs('SD_ADMIN');
    renderWithProviders(<Sidebar />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    expect(screen.getByText('Sales manager')).toBeInTheDocument();
    expect(screen.queryByText(/[가-힣]/)).not.toBeInTheDocument();
  });

  it('사이드바: 한국어 역할 글자는 예전과 같다', () => {
    loginAs('SD_ADMIN');
    renderWithProviders(<Sidebar />);
    expect(screen.getByRole('button', { name: '사이드바 접기' })).toBeInTheDocument();
    expect(screen.getByText('영업관리 부서 관리자')).toBeInTheDocument();
  });

  it('사이드바: 특수 관리자와 모르는 역할', () => {
    loginAs('SUPPLIER_ADMIN');
    const { unmount } = renderWithProviders(<Sidebar />, { locale: 'en' });
    expect(screen.getByText('Supplier admin')).toBeInTheDocument();
    unmount();
    loginAs('XX_USER');
    renderWithProviders(<Sidebar />);
    expect(screen.getByText('XX_USER')).toBeInTheDocument();
  });

  it('헤더 메뉴: 역할에 따라 바뀐 이름도 영어', () => {
    loginAs('CUSTOMER_ADMIN');
    renderWithProviders(<Navigation />, { locale: 'en' });
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Purchasing' })).toHaveAttribute('href', '/sales');
  });

  it('알림: 머리, 출처 표시, 빈 목록이 영어', () => {
    const { unmount } = renderWithProviders(
      <>
        <NotificationHeader notificationCount={1} onReadAll={vi.fn()} />
        <NotificationList
          notifications={[notification('PR'), notification('HRM'), notification('FCM')]}
          onNotificationClick={vi.fn()}
        />
      </>,
      { locale: 'en' },
    );
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeInTheDocument();
    expect(screen.getByText('Purchasing')).toBeInTheDocument();
    expect(screen.getByText('HR')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getAllByText('2026.11.10 09:05')).toHaveLength(3);
    unmount();

    renderWithProviders(<NotificationList notifications={[]} onNotificationClick={vi.fn()} />, {
      locale: 'en',
    });
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('알림: 한국어 출처와 시간은 예전과 같다', () => {
    renderWithProviders(
      <NotificationList notifications={[notification('SD')]} onNotificationClick={vi.fn()} />,
    );
    expect(screen.getByText('판매')).toBeInTheDocument();
    expect(screen.getByText('2026.11.10 09:05')).toBeInTheDocument();
  });

  it('지표 띠: 영역 이름, 기간, 비교 문구, 추이 이름, 오류가 영어', async () => {
    const { unmount } = renderWithProviders(<StatSection statsData={statsData} />, {
      locale: 'en',
    });
    const metrics = screen.getByRole('region', { name: 'Metrics' });
    expect(within(metrics).getByText('vs last week')).toBeInTheDocument();
    expect(within(metrics).getByRole('img', { name: /^Revenue trend/ })).toBeInTheDocument();
    await userEvent.click(within(metrics).getByRole('button', { name: 'This quarter' }));
    expect(within(metrics).getByText('vs last quarter')).toBeInTheDocument();
    unmount();

    renderWithProviders(<StatSection statsData={statsData} error={new Error('x')} />, {
      locale: 'en',
    });
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load metrics.");
  });

  it('달력: 버튼, 이전 달과 다음 달, 연월 선택, 요일, 날짜 이름이 영어', async () => {
    renderWithProviders(<CalendarButton selectedDate="2026-11-15" onDateChange={vi.fn()} />, {
      locale: 'en',
    });
    await userEvent.click(screen.getByRole('button', { name: '2026-11-15' }));
    const dialog = screen.getByRole('dialog', { name: 'Select date' });
    expect(within(dialog).getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: 'Year' })).toHaveDisplayValue('2026');
    expect(within(dialog).getByRole('combobox', { name: 'Month' })).toHaveDisplayValue('November');
    expect(within(dialog).getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    expect(within(dialog).getByRole('columnheader', { name: 'Sunday' })).toHaveTextContent('Su');
    expect(
      within(dialog).getByRole('button', { name: 'Sunday, November 15, 2026' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('달력: 한국어 날짜 이름과 연월은 예전과 같다', async () => {
    renderWithProviders(<CalendarButton selectedDate="2026-11-15" onDateChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '2026-11-15' }));
    const dialog = screen.getByRole('dialog', { name: '날짜 선택' });
    expect(within(dialog).getByRole('grid', { name: '2026년 11월' })).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: '연도' })).toHaveDisplayValue('2026년');
    expect(within(dialog).getByRole('combobox', { name: '월' })).toHaveDisplayValue('11월');
    expect(within(dialog).getByRole('columnheader', { name: '일요일' })).toHaveTextContent('일');
    expect(
      within(dialog).getByRole('button', { name: '2026년 11월 15일 일요일' }),
    ).toBeInTheDocument();
  });

  it('기간 선택: 빈 칸 이름이 영어', () => {
    renderWithProviders(
      <DateRangePicker
        startDate=""
        endDate=""
        onStartDateChange={vi.fn()}
        onEndDateChange={vi.fn()}
      />,
      { locale: 'en' },
    );
    expect(screen.getByRole('button', { name: 'Start date' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End date' })).toBeInTheDocument();
  });

  it('모달 틀: 제목 없는 이름과 닫기 버튼이 영어', () => {
    renderWithProviders(
      <ModalContainer onClose={vi.fn()}>
        <p>body</p>
      </ModalContainer>,
      { locale: 'en' },
    );
    const dialog = screen.getByRole('dialog', { name: 'Dialog' });
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('토스트: 닫기 버튼 이름이 영어', async () => {
    renderWithProviders(<ToastTrigger />, { locale: 'en' });
    await userEvent.click(screen.getByRole('button', { name: 'show' }));
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('표 상태: 부르는 쪽이 준 문구를 그대로 보인다(영어 화면에 한국어를 덧붙이지 않는다)', () => {
    renderWithProviders(<TableStatusBox type="error" message="Couldn't load orders." />, {
      locale: 'en',
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load orders\.$/);
  });

  it('드롭다운 "전체" 항목: 영어는 All, 한국어는 그대로, 서버가 준 전체는 겹치지 않는다', async () => {
    const fetchFn = () => Promise.resolve([{ key: 'A', value: 'Alpha' }]);
    const english = renderHook(() => useDropdown('i18n-all', fetchFn, 'with-all'), {
      wrapper: dropdownWrapper('en'),
    });
    await waitFor(() => expect(english.result.current.options).toHaveLength(2));
    expect(english.result.current.options).toEqual([
      { key: '', value: 'All' },
      { key: 'A', value: 'Alpha' },
    ]);

    const korean = renderHook(() => useDropdown('i18n-all', fetchFn, 'with-all'), {
      wrapper: dropdownWrapper('ko'),
    });
    await waitFor(() => expect(korean.result.current.options).toHaveLength(2));
    expect(korean.result.current.options[0]).toEqual({ key: '', value: '전체' });

    const serverAll = () => Promise.resolve([{ key: 'ALL', value: '전체' }]);
    const withServerAll = renderHook(() => useDropdown('i18n-server-all', serverAll, 'with-all'), {
      wrapper: dropdownWrapper('en'),
    });
    await waitFor(() => expect(withServerAll.result.current.options).toHaveLength(1));
    expect(withServerAll.result.current.options).toEqual([{ key: 'ALL', value: '전체' }]);
  });
});
