import { describe, expect, it } from 'vitest';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { scenarioResponse } from '@/mocks/scenario';
import { makePage, ok } from '@/mocks/utils';
import { NOTIFICATION_ENDPOINTS } from '@/lib/api/notification.endpoints';
import { fetchNotificationCounts, fetchNotifications } from './notification.api';
import { isAppError } from '@/lib/AppError';

const rejectsWithKind = async (p: Promise<unknown>, kind: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => isAppError(e) && e.kind === kind);
};

describe('notification.api 는 실패를 삼키지 않는다', () => {
  it('목록 500 → server 로 reject (빈 목록 아님)', async () => {
    server.use(http.get(NOTIFICATION_ENDPOINTS.LIST, () => scenarioResponse('500')));
    await rejectsWithKind(fetchNotifications(0, 10), 'server');
  });

  it('목록 연결 끊김 → network 로 reject', async () => {
    server.use(http.get(NOTIFICATION_ENDPOINTS.LIST, () => scenarioResponse('network')));
    await rejectsWithKind(fetchNotifications(0, 10), 'network');
  });

  it('개수 500 → server 로 reject ({ count: 0 } 아님)', async () => {
    server.use(http.get(NOTIFICATION_ENDPOINTS.COUNT, () => scenarioResponse('500')));
    await rejectsWithKind(fetchNotificationCounts(), 'server');
  });

  it('성공하면 기존 핸들러 데이터를 그대로 돌려준다', async () => {
    const res = await fetchNotifications(0, 10);
    expect(res.content.length).toBeGreaterThan(0);
  });
});

// 알림 UI 연결 카드: 응답을 zod 로 확인하고, 안 읽은 수는 status 를 명시한다
describe('notification.api 응답 검증과 파라미터', () => {
  const item = {
    notificationId: 'n-1',
    notificationTitle: '제목',
    notificationMessage: '내용',
    linkType: 'PURCHASE_ORDER',
    linkId: 'po-1',
    source: 'PR',
    createdAt: '2026-11-12T09:05:00',
    isRead: false,
  };

  it('안 읽은 수는 status=UNREAD 로 묻는다(게이트웨이 AlarmController.java:109)', async () => {
    let status: string | null = null;
    server.use(
      http.get(NOTIFICATION_ENDPOINTS.COUNT, ({ request }) => {
        status = new URL(request.url).searchParams.get('status');
        return ok({ count: 7 });
      }),
    );
    await expect(fetchNotificationCounts('UNREAD')).resolves.toEqual({ count: 7 });
    expect(status).toBe('UNREAD');
  });

  it('목록은 page 와 size 를 보낸다', async () => {
    let query = '';
    server.use(
      http.get(NOTIFICATION_ENDPOINTS.LIST, ({ request }) => {
        query = new URL(request.url).search;
        return ok({ content: [item], page: makePage(2, 3, 9) });
      }),
    );
    await fetchNotifications(2, 3);
    expect(query).toBe('?page=2&size=3');
  });

  it('목록 항목 모양이 틀리면 invalidShape(빈 목록으로 바꾸지 않는다)', async () => {
    server.use(
      http.get(NOTIFICATION_ENDPOINTS.LIST, () =>
        ok({ content: [{ ...item, isRead: 'N' }], page: makePage(0, 3, 1) }),
      ),
    );
    await rejectsWithKind(fetchNotifications(0, 3), 'invalidShape');
  });

  it('linkType, linkId 가 null 이거나 없어도 받는다(알림 서버가 참조 없는 알림에 null)', async () => {
    const { linkId: _linkId, ...withoutLinkId } = item;
    server.use(
      http.get(NOTIFICATION_ENDPOINTS.LIST, () =>
        ok({
          content: [{ ...item, linkType: null, linkId: null }, withoutLinkId],
          page: makePage(0, 3, 2),
        }),
      ),
    );
    const res = await fetchNotifications(0, 3);
    expect(res.content).toHaveLength(2);
  });

  it('source 가 모르는 값이어도 받는다(출처 하나 때문에 목록 전체를 막지 않는다)', async () => {
    server.use(
      http.get(NOTIFICATION_ENDPOINTS.LIST, () =>
        ok({ content: [{ ...item, source: 'QA' }, item], page: makePage(0, 3, 2) }),
      ),
    );
    const res = await fetchNotifications(0, 3);
    expect(res.content.map((n) => n.source)).toEqual(['QA', 'PR']);
  });

  it('source 가 문자열이 아니면 invalidShape', async () => {
    server.use(
      http.get(NOTIFICATION_ENDPOINTS.LIST, () =>
        ok({ content: [{ ...item, source: null }], page: makePage(0, 3, 1) }),
      ),
    );
    await rejectsWithKind(fetchNotifications(0, 3), 'invalidShape');
  });

  it('개수 응답에 count 가 없으면 invalidShape({ count: 0 } 으로 바꾸지 않는다)', async () => {
    server.use(http.get(NOTIFICATION_ENDPOINTS.COUNT, () => ok({ total: 3 })));
    await rejectsWithKind(fetchNotificationCounts('UNREAD'), 'invalidShape');
  });
});
