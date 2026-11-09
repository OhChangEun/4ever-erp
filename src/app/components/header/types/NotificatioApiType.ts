import type { Schema } from '@/lib/api/contract';

type SourceType = 'PR' | 'SD' | 'IM' | 'FCM' | 'HRM' | 'PP' | 'CUS' | 'SUP';

// isRead: false;
export type NotificationData = Schema<'NotificationData'>;

// 알림 목록 조회
export type NotificationListResponse = Schema<'NotificationListResponse'>;

// 알림 갯수 조회
export type NotificationCountResponse = Schema<'NotificationCountResponse'>;
