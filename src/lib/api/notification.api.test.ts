import { describe, expect, it } from 'vitest';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { scenarioResponse } from '@/mocks/scenario';
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
