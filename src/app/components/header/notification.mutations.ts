import type { QueryKey } from '@tanstack/react-query';
import {
  useInvalidatingMutation,
  type MutationCallbacks,
} from '@/lib/query/useInvalidatingMutation';
import { readAllNotifications, readNotification } from '@/lib/api/notification.api';
import { notificationKeys } from './header.keys';

/** 알림 mutation → 다시 가져올 쿼리 키. 읽음 처리는 목록과 사이드바 뱃지(안 읽은 수)를 같이 바꾼다. */
export const NOTIFICATION_MUTATION_EFFECTS = {
  readAll: (): readonly QueryKey[] => [notificationKeys.lists(), notificationKeys.unreadCount()],
  readOne: (): readonly QueryKey[] => [notificationKeys.lists(), notificationKeys.unreadCount()],
} as const;

export type NotificationMutationName = keyof typeof NOTIFICATION_MUTATION_EFFECTS;
export const notificationMutationKey = (name: NotificationMutationName) =>
  ['notifications', 'mutation', name] as const;

export const useReadAllNotifications = (callbacks?: MutationCallbacks<void, void>) =>
  useInvalidatingMutation<void, void>({
    mutationKey: notificationMutationKey('readAll'),
    mutationFn: () => readAllNotifications(),
    effects: () => NOTIFICATION_MUTATION_EFFECTS.readAll(),
    callbacks,
  });

export const useReadNotification = (callbacks?: MutationCallbacks<void, string>) =>
  useInvalidatingMutation<void, string>({
    mutationKey: notificationMutationKey('readOne'),
    mutationFn: (notificationId) => readNotification(notificationId),
    effects: () => NOTIFICATION_MUTATION_EFFECTS.readOne(),
    callbacks,
  });
