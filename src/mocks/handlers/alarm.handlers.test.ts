// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getResponse } from 'msw';
import { API_BASE_URL } from '@/app/types/api';
import { alarmHandlers, resetAlarmMock } from './alarm.handlers';

/**
 * 알림 목(알림 UI 연결 카드). 목록, 안 읽은 수, 읽음 처리가 같은 상태를 본다.
 * 처음 상태: 5건, 안 읽음 3건(ntf-001, ntf-003, ntf-004).
 */
const ORIGIN = 'http://localhost';
const BASE = `${API_BASE_URL}/alarm/notifications`;

interface Item {
  notificationId: string;
  isRead: boolean;
}

const send = async (method: string, path: string, token = '') => {
  const response = await getResponse(
    alarmHandlers,
    new Request(new URL(`${BASE}${path}`, ORIGIN), {
      method,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
    { baseUrl: ORIGIN },
  );
  if (!response) throw new Error(`목 핸들러 없음: ${method} ${path}`);
  return response;
};

const data = async <T>(method: string, path: string, token = ''): Promise<T> =>
  ((await (await send(method, path, token)).json()) as { data: T }).data;

const unread = (token = '') => data<{ count: number }>('GET', '/count?status=UNREAD', token);
const list = (query = '?size=100', token = '') =>
  data<{ content: Item[]; page: { totalPages: number; totalElements: number } }>(
    'GET',
    `/list${query}`,
    token,
  );

afterEach(() => {
  resetAlarmMock();
  vi.useRealTimers();
});

describe('알림 목: 목록, 안 읽은 수, 읽음 처리가 서로 맞는다', () => {
  it('안 읽은 수는 목록의 안 읽은 항목 수와 같다. status 가 없으면 UNREAD', async () => {
    const { content } = await list();
    expect(content).toHaveLength(5);
    const unreadInList = content.filter((item) => !item.isRead).length;
    expect(unreadInList).toBe(3);
    expect(await unread()).toEqual({ count: unreadInList });
    expect(await data('GET', '/count')).toEqual({ count: unreadInList });
    expect(await data('GET', '/count?status=READ')).toEqual({ count: 2 });
  });

  it('page 와 size 로 나눈다', async () => {
    const first = await list('?page=0&size=3');
    expect(first.content.map((item) => item.notificationId)).toEqual([
      'ntf-001',
      'ntf-002',
      'ntf-003',
    ]);
    expect(first.page).toMatchObject({ totalPages: 2, totalElements: 5 });
    const second = await list('?page=1&size=3');
    expect(second.content.map((item) => item.notificationId)).toEqual(['ntf-004', 'ntf-005']);
  });

  it('하나 읽으면 그 항목이 읽음이 되고 안 읽은 수가 1 준다. 같은 것을 또 읽으면 0건 처리', async () => {
    expect(await data('PATCH', '/ntf-001/read')).toEqual({ processedCount: 1 });
    expect(await unread()).toEqual({ count: 2 });
    const { content } = await list();
    expect(content.find((item) => item.notificationId === 'ntf-001')?.isRead).toBe(true);
    expect(await data('PATCH', '/ntf-001/read')).toEqual({ processedCount: 0 });
    expect(await unread()).toEqual({ count: 2 });
  });

  it('없는 id 는 0건 처리, 안 읽은 수 그대로', async () => {
    expect(await data('PATCH', '/nope/read')).toEqual({ processedCount: 0 });
    expect(await unread()).toEqual({ count: 3 });
  });

  it('전체 읽음 뒤 안 읽은 수는 0', async () => {
    expect(await data('PATCH', '/all/read')).toEqual({ processedCount: 3 });
    expect(await unread()).toEqual({ count: 0 });
    expect((await list()).content.every((item) => item.isRead)).toBe(true);
  });

  it('상태는 Authorization 값(로그인)별로 따로다', async () => {
    await data('PATCH', '/all/read', 'session-a');
    expect(await unread('session-a')).toEqual({ count: 0 });
    expect(await unread('session-b')).toEqual({ count: 3 });
  });

  it('구독: keepalive 뒤 alarm 이 오고, 그 알림이 목록과 안 읽은 수에 들어 있다', async () => {
    vi.useFakeTimers();
    const response = await send('GET', '/subscribe');
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const body = response.text();
    await vi.advanceTimersByTimeAsync(2_000);
    const events = [...(await body).matchAll(/^event: (\w+)$/gm)].map((match) => match[1]);
    expect(events).toEqual(['keepalive', 'alarm']);
    expect(await unread()).toEqual({ count: 4 });
    expect((await list()).content).toHaveLength(6);
  });
});
