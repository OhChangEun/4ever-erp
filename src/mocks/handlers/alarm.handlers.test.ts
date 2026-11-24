// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getResponse } from 'msw';
import * as z from 'zod';
import { API_BASE_URL } from '@/app/types/api';
import { mockApi } from '@/test/mockApi';
import { resetMockState } from '../state';
import { alarmHandlers } from './alarm.handlers';

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
  resetMockState();
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

describe('알림이 말하는 번호는 실제 목록에 있다', () => {
  const RowsBody = z.object({
    data: z.object({ content: z.array(z.record(z.string(), z.unknown())) }),
  });
  const ItemsBody = z.object({
    data: z.object({
      content: z.array(
        z.object({
          notificationMessage: z.string(),
          linkType: z.nullable(z.string()),
          linkId: z.nullable(z.string()),
          createdAt: z.string(),
        }),
      ),
    }),
  });
  /** 알림 종류 → [목록, id 칸, 번호 칸, 그 문서의 날짜 칸] */
  const LISTS: Record<string, [string, string, string, string?]> = {
    PURCHASE_ORDER: [
      '/scm-pp/mm/purchase-orders',
      'purchaseOrderId',
      'purchaseOrderNumber',
      'orderDate',
    ],
    PURCHASE_REQUISITION: [
      '/scm-pp/mm/purchase-requisitions',
      'purchaseRequisitionId',
      'purchaseRequisitionNumber',
      'requestDate',
    ],
    QUOTATION: ['/business/sd/quotations', 'quotationId', 'quotationNumber', 'quotationDate'],
    PURCHASE_INVOICE: ['/business/fcm/invoice/ap', 'invoiceId', 'invoiceNumber', 'issueDate'],
    INSUFFICIENT_STOCK: ['/scm-pp/iv/shortage', 'itemId', 'itemNumber'],
  };

  // 매입 전표는 최근 12달만 있어 해가 바뀐 뒤와 달의 첫날도 본다
  it.each(['2026-11-24', '2026-12-01', '2027-03-01', '2028-01-01'])(
    '%s: 번호와 id 가 같은 행이고 알림 시각이 그 문서보다 앞서거나 앞날이 아니다',
    async (today) => {
      vi.useFakeTimers();
      // 한국 새벽 1시
      vi.setSystemTime(new Date(`${today}T01:00:00+09:00`));
      // 구독하면 새 알림(구매 요청 승인)이 하나 더 온다
      const response = await send('GET', '/subscribe');
      const body = response.text();
      await vi.advanceTimersByTimeAsync(2_000);
      await body;

      const { content } = ItemsBody.parse(await (await send('GET', '/list?size=100')).json()).data;
      const named = content.filter((item) => item.linkType !== null);
      expect(named.map((item) => item.linkType).sort()).toEqual(Object.keys(LISTS).sort());
      for (const item of named) {
        const [path, idKey, numberKey, dateKey] = LISTS[item.linkType ?? ''];
        const rows = RowsBody.parse(await mockApi('GET', `${path}?page=0&size=5000`)).data.content;
        const row = rows.find((candidate) => candidate[idKey] === item.linkId);
        const number = /[A-Z]+-\d[\d-]*/.exec(item.notificationMessage)?.[0];
        expect([item.linkType, row?.[numberKey]]).toEqual([item.linkType, number]);
        if (dateKey) expect(item.createdAt.slice(0, 10) >= String(row?.[dateKey])).toBe(true);
      }
      const times = content.map((item) => item.createdAt);
      expect(times).toEqual([...times].sort().reverse());
      expect(times.every((time) => Date.parse(`${time}+09:00`) <= Date.now())).toBe(true);
    },
  );
});
