import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { scenarioResponse } from '@/mocks/scenario';
import { resetAlarmMock } from '@/mocks/handlers/alarm.handlers';
import { makePage, ok } from '@/mocks/utils';
import { NOTIFICATION_BASE_PATH, NOTIFICATION_ENDPOINTS } from '@/lib/api/notification.endpoints';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import Sidebar from '@/app/components/sidebar/Sidebar';
import { notificationKeys } from '../header.keys';
import NotificationBell from './NotificationBell';

/**
 * 알림 UI 연결 카드(ai/cards/2026-11-12_알림_UI_연결.md).
 * 목(alarm.handlers.ts)의 처음 상태: 알림 5건, 안 읽음 3건(ntf-001, ntf-003, ntf-004). 팝오버는 한 쪽에 3건.
 */
const { fetchEventSource } = vi.hoisted(() => ({
  fetchEventSource: vi.fn((..._args: unknown[]) => new Promise<void>(() => undefined)),
}));
vi.mock('@microsoft/fetch-event-source', () => ({ fetchEventSource }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/sales',
}));

const STREAM = { 'content-type': 'text/event-stream' };
const READ_ONE = `${NOTIFICATION_BASE_PATH}/:notificationId/read`;

const loginAs = (role: string) =>
  useAuthStore.getState().setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role });

// 테스트 Provider 의 토스트 영역도 role=status 라, 알림 버튼 옆의 것만 고른다
const bellStatus = (button: HTMLElement) => within(button.parentElement!).getByRole('status');
// 뱃지는 버튼 위에 겹친 숫자(3, 99+). 버튼 이름에는 aria-label 로 들어간다. 팝오버 안의 숫자(쪽 번호)는 뺀다
const badgeOf = (button: HTMLElement) =>
  within(button.parentElement!)
    .queryAllByText(/^\d+\+?$/)
    .find((element) => !element.closest('[role="dialog"]')) ?? null;

const openPopover = async (name = '알림, 안 읽은 알림 3개', dialogName = '알림') => {
  const button = await screen.findByRole('button', { name });
  await userEvent.click(button);
  const dialog = await screen.findByRole('dialog', { name: dialogName });
  return { button, dialog };
};

afterEach(() => {
  resetAlarmMock();
  useAuthStore.getState().clearUserInfo();
  useSidebarStore.getState().setExpanded(true);
  vi.unstubAllEnvs();
  vi.useRealTimers();
  fetchEventSource.mockClear();
});

describe('사이드바 알림 버튼', () => {
  it('사이드바에 알림 버튼과 안 읽은 수 뱃지가 있고, 접어도 남는다', async () => {
    loginAs('ALL_ADMIN');
    renderWithProviders(<Sidebar />);
    const button = await screen.findByRole('button', { name: '알림, 안 읽은 알림 3개' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(badgeOf(button)).toHaveTextContent('3');
    // 처음 받은 수는 "새 알림"으로 알리지 않는다
    expect(bellStatus(button)).toBeEmptyDOMElement();

    act(() => useSidebarStore.getState().setExpanded(false));
    const collapsed = screen.getByRole('button', { name: '알림, 안 읽은 알림 3개' });
    expect(badgeOf(collapsed)).toHaveTextContent('3');
  });

  it('안 읽은 수가 99 를 넘으면 뱃지는 99+, 이름은 실제 수', async () => {
    server.use(http.get(NOTIFICATION_ENDPOINTS.COUNT, () => ok({ count: 120 })));
    renderWithProviders(<NotificationBell isExpanded />);
    const button = await screen.findByRole('button', { name: '알림, 안 읽은 알림 120개' });
    expect(badgeOf(button)).toHaveTextContent('99+');
  });

  it('안 읽은 수 조회가 실패하면 뱃지만 없고 버튼은 남는다', async () => {
    server.use(http.get(NOTIFICATION_ENDPOINTS.COUNT, () => scenarioResponse('500')));
    const { queryClient } = renderWithProviders(<NotificationBell isExpanded />);
    await waitFor(() =>
      expect(queryClient.getQueryState(notificationKeys.unreadCount())?.status).toBe('error'),
    );
    const button = screen.getByRole('button', { name: '알림' });
    expect(badgeOf(button)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('알림 팝오버', () => {
  it('버튼을 누르면 알림 목록이 list 로 뜨고 버튼이 열림 상태가 된다', async () => {
    renderWithProviders(<NotificationBell isExpanded />);
    const { button, dialog } = await openPopover();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const items = await within(dialog).findAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(dialog).getByRole('list')).toBeInTheDocument();
    // 안 읽은 알림만 누를 수 있다
    expect(within(dialog).getByRole('button', { name: /발주 승인 요청/ })).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: /재고 부족 경고/ }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText('재고 부족 경고')).toBeInTheDocument();
  });

  it('안 읽은 알림을 누르면 읽음 처리되고 뱃지가 3 에서 2 로 준다', async () => {
    renderWithProviders(<NotificationBell isExpanded />);
    const { dialog } = await openPopover();
    await userEvent.click(await within(dialog).findByRole('button', { name: /발주 승인 요청/ }));

    const button = await screen.findByRole('button', { name: '알림, 안 읽은 알림 2개' });
    expect(badgeOf(button)).toHaveTextContent('2');
    await waitFor(() =>
      expect(
        within(dialog).queryByRole('button', { name: /발주 승인 요청/ }),
      ).not.toBeInTheDocument(),
    );
    // 팝오버는 열린 채로 남는다
    expect(within(dialog).getByText('발주 승인 요청')).toBeInTheDocument();
  });

  it('전체 읽음을 누르면 뱃지가 사라진다', async () => {
    renderWithProviders(<NotificationBell isExpanded />);
    const { dialog } = await openPopover();
    await userEvent.click(await within(dialog).findByRole('button', { name: '전체 읽음' }));

    const button = await screen.findByRole('button', { name: '알림, 안 읽은 알림 0개' });
    expect(badgeOf(button)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(within(dialog).queryByRole('button', { name: '전체 읽음' })).not.toBeInTheDocument(),
    );
  });

  it('목록을 못 받으면 실패 문구와 다시 시도가 보이고, 누르면 다시 받는다', async () => {
    server.use(http.get(NOTIFICATION_ENDPOINTS.LIST, () => scenarioResponse('500')));
    renderWithProviders(<NotificationBell isExpanded />);
    const { dialog } = await openPopover();
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '알림을 불러오지 못했습니다.',
    );
    expect(within(dialog).queryByRole('listitem')).not.toBeInTheDocument();

    server.resetHandlers();
    await userEvent.click(within(dialog).getByRole('button', { name: '다시 시도' }));
    expect(await within(dialog).findAllByRole('listitem')).toHaveLength(3);
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('알림이 없으면 "알림이 없습니다"', async () => {
    server.use(
      http.get(NOTIFICATION_ENDPOINTS.LIST, () => ok({ content: [], page: makePage(0, 3, 0) })),
      http.get(NOTIFICATION_ENDPOINTS.COUNT, () => ok({ count: 0 })),
    );
    renderWithProviders(<NotificationBell isExpanded />);
    const { dialog } = await openPopover('알림, 안 읽은 알림 0개');
    expect(await within(dialog).findByText('알림이 없습니다')).toBeInTheDocument();
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('읽음 처리가 실패하면 실패 문구가 보이고 뱃지는 그대로다', async () => {
    server.use(http.patch(READ_ONE, () => scenarioResponse('500')));
    renderWithProviders(<NotificationBell isExpanded />);
    const { button, dialog } = await openPopover();
    await userEvent.click(await within(dialog).findByRole('button', { name: /발주 승인 요청/ }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('읽음 처리에 실패했습니다.');
    expect(button).toHaveAccessibleName('알림, 안 읽은 알림 3개');
    expect(within(dialog).getByRole('button', { name: /발주 승인 요청/ })).toBeInTheDocument();
  });

  it('Esc 로 닫히고 포커스가 알림 버튼으로 돌아온다', async () => {
    renderWithProviders(<NotificationBell isExpanded />);
    const { button, dialog } = await openPopover();
    await within(dialog).findAllByRole('listitem');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(button).toHaveFocus());
  });

  it('다음을 누르면 2쪽의 알림 2건이 보인다', async () => {
    renderWithProviders(<NotificationBell isExpanded />);
    const { dialog } = await openPopover();
    await within(dialog).findByText('발주 승인 요청');
    await userEvent.click(within(dialog).getByRole('button', { name: '다음' }));
    expect(await within(dialog).findByText('매입 전표 등록')).toBeInTheDocument();
    expect(within(dialog).getByText('휴가 승인')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getAllByRole('listitem')).toHaveLength(2));
    expect(within(dialog).getByRole('button', { name: '다음' })).toBeDisabled();
  });

  it('열려 있는 동안 버튼의 aria-controls 가 팝오버를 가리킨다', async () => {
    renderWithProviders(<NotificationBell isExpanded />);
    const closed = await screen.findByRole('button', { name: '알림, 안 읽은 알림 3개' });
    expect(closed).not.toHaveAttribute('aria-controls');
    const { button, dialog } = await openPopover();
    expect(dialog.id).not.toBe('');
    expect(button).toHaveAttribute('aria-controls', dialog.id);
    await userEvent.keyboard('{Escape}');
    expect(button).not.toHaveAttribute('aria-controls');
  });

  it('모르는 출처(source)가 와도 목록이 그려지고 그 줄 출처는 "알 수 없음"', async () => {
    server.use(
      http.get(NOTIFICATION_ENDPOINTS.LIST, () =>
        ok({
          content: [
            {
              notificationId: 'ntf-new',
              notificationTitle: '품질 검사 요청',
              notificationMessage: 'QA-2026-003 검사가 요청되었습니다.',
              linkType: null,
              linkId: null,
              source: 'QA',
              createdAt: '2026-11-12T10:00:00',
              isRead: true,
            },
            {
              notificationId: 'ntf-pr',
              notificationTitle: '발주 승인 요청',
              notificationMessage: 'PO-2026-001 승인 요청이 도착했습니다.',
              linkType: 'PURCHASE_ORDER',
              linkId: 'po-001',
              source: 'PR',
              createdAt: '2026-11-12T09:05:00',
              isRead: true,
            },
          ],
          page: makePage(0, 3, 2),
        }),
      ),
    );
    renderWithProviders(<NotificationBell isExpanded />);
    const { dialog } = await openPopover();
    const items = await within(dialog).findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('품질 검사 요청')).toBeInTheDocument();
    expect(within(items[0]).getByText('알 수 없음')).toBeInTheDocument();
    expect(within(items[1]).getByText('구매')).toBeInTheDocument();
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('바깥을 누르면 닫히고, 알림 버튼을 다시 누르면 닫힌다', async () => {
    renderWithProviders(
      <>
        <NotificationBell isExpanded />
        <p>본문</p>
      </>,
    );
    const { button } = await openPopover();
    await userEvent.click(screen.getByText('본문'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(button);
    expect(await screen.findByRole('dialog', { name: '알림' })).toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('읽은 뒤에도 포커스가 팝오버 안에 남는다(누른 항목이 버튼이 아니게 돼도)', async () => {
    renderWithProviders(<NotificationBell isExpanded />);
    const { dialog } = await openPopover();
    await userEvent.click(await within(dialog).findByRole('button', { name: /발주 승인 요청/ }));
    await screen.findByRole('button', { name: '알림, 안 읽은 알림 2개' });
    await waitFor(() => expect(dialog).toHaveFocus());
  });

  it('영어 화면: 버튼 이름, 팝오버 제목, 전체 읽음, 실패 문구가 영어', async () => {
    const { unmount } = renderWithProviders(<NotificationBell isExpanded />, { locale: 'en' });
    const { dialog } = await openPopover('Notifications, 3 unread', 'Notifications');
    expect(
      await within(dialog).findByRole('button', { name: 'Mark all as read' }),
    ).toBeInTheDocument();
    unmount();

    server.use(http.get(NOTIFICATION_ENDPOINTS.LIST, () => scenarioResponse('500')));
    renderWithProviders(<NotificationBell isExpanded />, { locale: 'en' });
    const failed = await openPopover('Notifications, 3 unread', 'Notifications');
    expect(await within(failed.dialog).findByRole('alert')).toHaveTextContent(
      "Couldn't load notifications.",
    );
    expect(within(failed.dialog).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('새 알림 받기', () => {
  it('SSE 가 꺼져 있으면 60초마다 다시 받고, 수가 늘면 role=status 로 알린다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithProviders(<NotificationBell isExpanded />);
    await screen.findByRole('button', { name: '알림, 안 읽은 알림 3개' });
    expect(fetchEventSource).not.toHaveBeenCalled();

    server.use(http.get(NOTIFICATION_ENDPOINTS.COUNT, () => ok({ count: 4 })));
    await act(() => vi.advanceTimersByTimeAsync(59_000));
    expect(screen.getByRole('button', { name: '알림, 안 읽은 알림 3개' })).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1_000));

    const grown = await screen.findByRole('button', { name: '알림, 안 읽은 알림 4개' });
    expect(bellStatus(grown)).toHaveTextContent('새 알림이 도착했습니다. 안 읽은 알림 4개');
  });

  it('SSE 로 alarm 이 오면 바로 다시 받아 뱃지가 늘고, 연결이 끊겨도 버튼은 그대로다', async () => {
    vi.stubEnv('NEXT_PUBLIC_SSE_ENABLED', 'true');
    loginAs('ALL_ADMIN');
    renderWithProviders(<NotificationBell isExpanded />);
    await screen.findByRole('button', { name: '알림, 안 읽은 알림 3개' });
    expect(fetchEventSource).toHaveBeenCalledTimes(1);
    const options = fetchEventSource.mock.calls[0][1] as {
      onopen: (response: Response) => Promise<void>;
      onmessage: (event: { event: string; data: string; id: string }) => void;
      onerror: (error: unknown) => number | undefined;
    };
    await act(() => options.onopen(new Response(null, { status: 200, headers: STREAM })));

    server.use(http.get(NOTIFICATION_ENDPOINTS.COUNT, () => ok({ count: 4 })));
    act(() => options.onmessage({ event: 'alarm', data: '{}', id: '' }));
    const grown = await screen.findByRole('button', { name: '알림, 안 읽은 알림 4개' });
    expect(bellStatus(grown)).toHaveTextContent('새 알림이 도착했습니다. 안 읽은 알림 4개');

    act(() => {
      options.onerror(new Error('connection lost'));
    });
    expect(screen.getByRole('button', { name: '알림, 안 읽은 알림 4개' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
