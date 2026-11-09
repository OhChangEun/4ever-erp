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
});
