import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { NOTIFICATION_ENDPOINTS } from '@/lib/api/notification.endpoints';

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
