import { NOTIFICATION_ENDPOINTS } from '@/lib/api/notification.endpoints';
import {
  type NotificationCountResponse,
  type NotificationListResponse,
} from '@/app/components/header/types/NotificationApiType';
import type { QueryOf } from '@/lib/api/contract';
import { getParsedLazy } from './parse';
import axios from '../axiosInstance';

// 스키마(zod)는 요청과 같이 받는다. 알림 버튼은 모든 화면 첫 로드에 실려서 zod 를 거기 넣지 않는다
const schemas = () => import('./notification.schemas');

type CountStatus = QueryOf<'/alarm/notifications/count'>['status'];

// 알림 목록 조회
export const fetchNotifications = (page: number, size: number): Promise<NotificationListResponse> =>
  getParsedLazy(
    () => schemas().then((m) => m.notificationListSchema),
    `${NOTIFICATION_ENDPOINTS.LIST}?page=${page}&size=${size}`,
  );

// 알림 개수 조회. 뱃지는 'UNREAD' 를 명시한다(게이트웨이는 status 가 없으면 알림 서버 기본값에 맡긴다)
export const fetchNotificationCounts = (status?: CountStatus): Promise<NotificationCountResponse> =>
  getParsedLazy(
    () => schemas().then((m) => m.notificationCountSchema),
    NOTIFICATION_ENDPOINTS.COUNT,
    { params: { status } },
  );

// 특정 알림 읽음 처리
export const readNotification = async (id: string) => {
  await axios.patch(NOTIFICATION_ENDPOINTS.READ_ONE(id));
};

// 전체 알림 읽음 처리
export const readAllNotifications = async () => {
  await axios.patch(NOTIFICATION_ENDPOINTS.READ_ALL);
};
