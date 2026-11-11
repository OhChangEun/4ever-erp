import * as z from 'zod/mini';
import type {
  NotificationCountResponse,
  NotificationData,
  NotificationListResponse,
} from '@/app/components/header/types/NotificationApiType';
import { pageSchema } from './schemas';

/**
 * 알림 GET 응답 스키마(알림 UI 연결 카드). 타입(계약)에 묶여 있어 계약이 바뀌면 컴파일에서 걸린다.
 * verified=false (provenance: 게이트웨이는 알림 서버 응답을 Object 로 넘긴다(AlarmHttpServiceImpl.java:48-63).
 * 필드는 알림 서버 사본 NotificationListResponseDto.java:16-24, NotificationCountResponseDto.java:14 기준)
 */
const notificationSchema: z.ZodMiniType<NotificationData> = z.looseObject({
  notificationId: z.string(),
  notificationTitle: z.string(),
  notificationMessage: z.string(),
  // 참조가 없는 알림은 null 이다(NotificationJpaAdapter.java:255-263). 화면은 두 필드를 쓰지 않는다
  linkType: z.nullish(z.string()),
  linkId: z.nullish(z.string()),
  // 문자열이면 받는다. 새 출처 하나 때문에 목록 전체를 형식 오류로 막지 않는다(화면은 모르는 값을 "알 수 없음"으로)
  source: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
});

export const notificationListSchema: z.ZodMiniType<NotificationListResponse> = z.looseObject({
  content: z.array(notificationSchema),
  page: pageSchema,
});

export const notificationCountSchema: z.ZodMiniType<NotificationCountResponse> = z.looseObject({
  count: z.number(),
});
