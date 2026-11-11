import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { NOTIFICATION_ENDPOINTS } from '@/lib/api/notification.endpoints';
import { createTestQueryClient } from '@/test/render';
import { isInvalidated, seedKeys } from '@/test/mutationMatrix';
import { notificationKeys, partnerProfileKeys } from '../header.keys';

const fetchEventSource = vi.fn((..._args: unknown[]) => new Promise<void>(() => undefined));
vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: unknown[]) => fetchEventSource(...args),
}));

const { useNotificationSSE } = await import('./useNotificationSSE');

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('알림 SSE 구독', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SSE_ENABLED', 'true');
    useAuthStore.setState({
      userInfo: { id: 1, name: '관리자', email: 'a@b.c', role: 'ALL_ADMIN' },
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    fetchEventSource.mockClear();
  });

  it('프록시 주소로 붙고 Authorization 헤더를 보내지 않는다(세션 쿠키로 인증)', () => {
    renderHook(() => useNotificationSSE({}), { wrapper });
    expect(fetchEventSource).toHaveBeenCalledTimes(1);
    const [url, options] = fetchEventSource.mock.calls[0] as [
      string,
      { headers?: Record<string, string> },
    ];
    expect(url).toBe(NOTIFICATION_ENDPOINTS.SUBSCRIBE);
    expect(url.startsWith('/api/proxy/')).toBe(true);
    expect(options.headers?.Authorization).toBeUndefined();
  });
});

// 알림 UI 연결 카드: 새 알림은 알림 키만 무효화하고, 끊기면 조용히 다시 붙는다
describe('알림 SSE: 무효화와 다시 붙기', () => {
  const STREAM = { 'content-type': 'text/event-stream' };
  interface SseOptions {
    onopen: (response: Response) => Promise<void>;
    onmessage: (event: { event: string; data: string; id: string }) => void;
    onclose: () => void;
    onerror: (error: unknown) => number | undefined;
  }

  const setup = () => {
    const queryClient = createTestQueryClient();
    const view = renderHook(() => useNotificationSSE({}), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    const options = fetchEventSource.mock.calls.at(-1)?.[1] as SseOptions;
    return { queryClient, options, ...view };
  };

  const NOTIFICATION = [
    notificationKeys.list(0),
    notificationKeys.list(1),
    notificationKeys.unreadCount(),
  ];
  const OTHERS = [partnerProfileKeys.byRole('ALL_ADMIN'), ['purchase', 'orders', 'list']];

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SSE_ENABLED', 'true');
    useAuthStore.setState({
      userInfo: { id: 1, name: '관리자', email: 'a@b.c', role: 'ALL_ADMIN' },
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    fetchEventSource.mockClear();
  });

  it('alarm 이벤트 → 알림 목록과 안 읽은 수만 무효화(다른 도메인 키는 그대로)', () => {
    const { queryClient, options } = setup();
    seedKeys(queryClient, [...NOTIFICATION, ...OTHERS]);
    act(() => options.onmessage({ event: 'alarm', data: '{"alarmId":"a-1"}', id: '' }));
    for (const key of NOTIFICATION)
      expect([key, isInvalidated(queryClient, key)]).toEqual([key, true]);
    for (const key of OTHERS) expect([key, isInvalidated(queryClient, key)]).toEqual([key, false]);
  });

  it('keepalive 는 아무것도 무효화하지 않는다', () => {
    const { queryClient, options } = setup();
    seedKeys(queryClient, NOTIFICATION);
    act(() => options.onmessage({ event: 'keepalive', data: 'ping', id: '' }));
    for (const key of NOTIFICATION) expect(isInvalidated(queryClient, key)).toBe(false);
  });

  it('연결되면 connected 가 true 이고, 끊긴 동안 놓친 알림을 다시 받는다', async () => {
    const { queryClient, options, result } = setup();
    seedKeys(queryClient, NOTIFICATION);
    expect(result.current.connected).toBe(false);
    await act(() => options.onopen(new Response(null, { status: 200, headers: STREAM })));
    expect(result.current.connected).toBe(true);
    for (const key of NOTIFICATION) expect(isInvalidated(queryClient, key)).toBe(true);
  });

  it('오류가 나면 connected 가 false 가 되고 60초 뒤 다시 붙는다(던지지 않는다)', async () => {
    const { options, result } = setup();
    await act(() => options.onopen(new Response(null, { status: 200, headers: STREAM })));
    let retryAfter: number | undefined;
    act(() => {
      retryAfter = options.onerror(new Error('network'));
    });
    expect(retryAfter).toBe(60_000);
    expect(result.current.connected).toBe(false);
  });

  it('서버가 연결을 닫으면 오류로 넘겨 다시 붙게 한다', () => {
    const { options } = setup();
    expect(() => options.onclose()).toThrow();
  });

  it('5xx 는 다시 붙고, 401 은 다시 붙지 않는다', async () => {
    const { options } = setup();
    const failed = await options
      .onopen(new Response(null, { status: 503 }))
      .catch((e: unknown) => e);
    expect(failed).toBeInstanceOf(Error);
    expect(options.onerror(failed)).toBe(60_000);

    const unauthorized = await options
      .onopen(new Response(null, { status: 401 }))
      .catch((e: unknown) => e);
    expect(unauthorized).toBeInstanceOf(Error);
    expect(() => options.onerror(unauthorized)).toThrow();
  });

  it('200 이어도 이벤트 스트림이 아니면 연결된 것으로 치지 않는다', async () => {
    const { options, result } = setup();
    const failed = await options
      .onopen(new Response('<html>', { status: 200 }))
      .catch((e: unknown) => e);
    expect(failed).toBeInstanceOf(Error);
    expect(result.current.connected).toBe(false);
  });

  it('NEXT_PUBLIC_SSE_ENABLED 가 없으면 붙지 않는다', () => {
    vi.unstubAllEnvs();
    const { result } = setup();
    expect(fetchEventSource).not.toHaveBeenCalled();
    expect(result.current.connected).toBe(false);
  });
});
