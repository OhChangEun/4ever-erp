import type { Schema } from '@/lib/api/contract';

export type NotificationData = Schema<'NotificationData'>;

// 알림 목록 조회
export type NotificationListResponse = Schema<'NotificationListResponse'>;

// 알림 갯수 조회
export type NotificationCountResponse = Schema<'NotificationCountResponse'>;
