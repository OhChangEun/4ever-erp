import { describe, it } from 'vitest';
import { expectMatrix } from '@/test/mutationMatrix';
import { notificationKeys, partnerProfileKeys } from './header.keys';
import { useReadAllNotifications, useReadNotification } from './notification.mutations';

describe('알림 mutation 훅', () => {
  it('전체 읽음 → 알림 목록', () =>
    expectMatrix({
      name: '',
      useHook: useReadAllNotifications,
      variables: undefined,
      invalidates: [notificationKeys.list(0), notificationKeys.list(1)],
      keeps: [partnerProfileKeys.byRole('ALL_ADMIN'), ['sales', 'quotes', 'list']],
    }));

  it('하나 읽음 → 알림 목록', () =>
    expectMatrix({
      name: '',
      useHook: useReadNotification,
      variables: 'ntf-001',
      invalidates: [notificationKeys.list(0)],
      keeps: [partnerProfileKeys.byRole('ALL_ADMIN')],
    }));

  // 알림 UI 연결 카드: 읽음 처리는 뱃지(안 읽은 수)도 바꾼다
  it('전체 읽음 → 안 읽은 수도 다시 받는다', () =>
    expectMatrix({
      name: '',
      useHook: useReadAllNotifications,
      variables: undefined,
      invalidates: [notificationKeys.unreadCount(), notificationKeys.list(0)],
      keeps: [partnerProfileKeys.byRole('ALL_ADMIN'), ['purchase', 'orders', 'list']],
    }));

  it('하나 읽음 → 안 읽은 수도 다시 받는다', () =>
    expectMatrix({
      name: '',
      useHook: useReadNotification,
      variables: 'ntf-001',
      invalidates: [notificationKeys.unreadCount(), notificationKeys.list(1)],
      keeps: [partnerProfileKeys.byRole('ALL_ADMIN'), ['dashboard', 'stats']],
    }));
});
