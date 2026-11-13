import { API_BASE_URL } from '@/app/types/api';

export const NOTIFICATION_BASE_PATH = `${API_BASE_URL}/alarm/notifications`;

export const NOTIFICATION_ENDPOINTS = {
  READ_ONE: (notificationId: string) => `${NOTIFICATION_BASE_PATH}/${notificationId}/read`, // 단일 알림 읽음 처리
  READ_ALL: `${NOTIFICATION_BASE_PATH}/all/read`, // 전체 알림 읽음 처리
  COUNT: `${NOTIFICATION_BASE_PATH}/count`, // 알림 개수 조회
  LIST: `${NOTIFICATION_BASE_PATH}/list`, // 알림 목록 조회
  SUBSCRIBE: `${NOTIFICATION_BASE_PATH}/subscribe`, // 알림 구독 요청
};
