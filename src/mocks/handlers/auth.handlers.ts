import { http, HttpResponse } from 'msw';
import { USER_ENDPOINTS, PROFILE_BASE_PATH, PROFILE_ENDPOINTS } from '@/app/types/api';
import { NOTIFICATION_BASE_PATH, NOTIFICATION_ENDPOINTS } from '@/lib/api/notification.endpoints';
import { ok, okNoData, error, shouldError, isoNow, makePage } from './utils';

const mockUserInfo = {
  id: 1,
  name: '홍길동',
  email: 'hong@test.com',
  role: 'USER',
};

const mockProfileInfo = {
  name: '홍길동',
  employeeNumber: 'EMP-2026-001',
  department: '영업팀',
  position: '팀장',
  hireDate: '2022-03-01',
  serviceYears: '3',
  email: 'user@everp.co.kr',
  phoneNumber: '010-1234-5678',
  address: '서울특별시 강남구 테헤란로 123',
  companyName: '에버피',
  baseAddress: '서울특별시 강남구 테헤란로 123',
  detailAddress: '10층',
  officePhone: '02-123-4567',
  businessNumber: '123-45-67890',
  customerName: '홍길동',
};

const mockNotificationList = {
  content: [
    {
      notificationId: 'ntf-001',
      notificationTitle: '발주 승인 요청',
      notificationMessage: 'PO-2026-001 승인 요청이 도착했습니다.',
      linkType: 'PURCHASE_ORDER',
      linkId: 'po-001',
      source: 'PR',
      createdAt: isoNow,
      isRead: false,
    },
    {
      notificationId: 'ntf-002',
      notificationTitle: '재고 부족 경고',
      notificationMessage: 'ITEM-1002의 재고가 안전재고 이하입니다.',
      linkType: 'INVENTORY',
      linkId: 'item-1002',
      source: 'IM',
      createdAt: isoNow,
      isRead: true,
    },
  ],
  page: makePage(0, 10, 2),
};

export const authHandlers = [
  // ----------------------- Auth -----------------------
  http.post(USER_ENDPOINTS.LOGIN, async ({ request }) => {
    if (shouldError(request)) return error('Unauthorized', 401);
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      user: mockUserInfo,
    });
  }),
  http.post(USER_ENDPOINTS.LOGOUT, ({ request }) => {
    if (shouldError(request)) return error('Logout failed', 500);
    return okNoData();
  }),
  http.get(USER_ENDPOINTS.USER_INFO, ({ request }) => {
    if (shouldError(request)) return error('Unauthorized', 401);
    return ok(mockUserInfo);
  }),
  http.get(USER_ENDPOINTS.USER_PROFILE_INFO, ({ request }) => {
    if (shouldError(request)) return error('Unauthorized', 401);
    return ok(mockProfileInfo);
  }),

  // ----------------------- Notification -----------------------
  http.get(NOTIFICATION_ENDPOINTS.LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load notifications', 500);
    return ok(mockNotificationList);
  }),
  http.get(NOTIFICATION_ENDPOINTS.COUNT, ({ request }) => {
    if (shouldError(request)) return error('Failed to load notification count', 500);
    return ok({ count: 2 });
  }),
  http.patch(`${NOTIFICATION_BASE_PATH}/:notificationId/read`, ({ request }) => {
    if (shouldError(request)) return error('Failed to mark as read', 500);
    return okNoData();
  }),
  http.patch(NOTIFICATION_ENDPOINTS.READ_ALL, ({ request }) => {
    if (shouldError(request)) return error('Failed to mark all as read', 500);
    return okNoData();
  }),
  http.get(NOTIFICATION_ENDPOINTS.SUBSCRIBE, ({ request }) => {
    if (shouldError(request)) return error('Unauthorized', 401);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: string) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        };

        send('keepalive', 'connected');
        send('unreadCount', '2');

        setTimeout(() => {
          send(
            'alarm',
            JSON.stringify({
              alarmId: 'alarm-001',
              alarmType: 'INFO',
              targetId: 'po-001',
              title: '발주 승인 요청',
              message: 'PO-2026-001 승인 요청이 도착했습니다.',
              linkId: 'po-001',
              linkType: 'PURCHASE_ORDER',
            }),
          );
        }, 500);

        setTimeout(() => controller.close(), 1500);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
  }),

  // ----------------------- Profile -----------------------
  http.post(PROFILE_ENDPOINTS.VACATION, ({ request }) => {
    if (shouldError(request)) return error('Failed to request vacation', 500);
    return okNoData();
  }),
  http.post(new RegExp(`${PROFILE_BASE_PATH}/trainings/request`), ({ request }) => {
    if (shouldError(request)) return error('Failed to register training', 500);
    return okNoData();
  }),
  http.patch(PROFILE_ENDPOINTS.CHECK_IN, ({ request }) => {
    if (shouldError(request)) return error('Failed to check in', 500);
    return okNoData();
  }),
  http.patch(PROFILE_ENDPOINTS.CHECK_OUT, ({ request }) => {
    if (shouldError(request)) return error('Failed to check out', 500);
    return okNoData();
  }),
  http.get(PROFILE_ENDPOINTS.PROFILE_INFO, ({ request }) => {
    if (shouldError(request)) return error('Failed to load profile info', 500);
    return ok(mockProfileInfo);
  }),
  http.get(PROFILE_ENDPOINTS.TODAY_ATTENDANCE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load today attendance', 500);
    return ok({
      checkInTime: '09:00',
      checkOutTime: '18:00',
      workHours: '8h',
      status: 'ON_TIME',
    });
  }),
  http.get(PROFILE_ENDPOINTS.ATTENDANCE_RECORDS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load attendance records', 500);
    return ok([
      {
        date: '2026-01-28',
        status: 'ON_TIME',
        startTime: '09:00',
        endTime: '18:00',
        workHours: '8h',
      },
    ]);
  }),
  http.get(PROFILE_ENDPOINTS.AVAILABLE_TRAINING, ({ request }) => {
    if (shouldError(request)) return error('Failed to load available training', 500);
    return ok([
      {
        trainingId: 'tr-001',
        trainingName: '안전 교육',
        trainingStatus: 'AVAILABLE',
        durationHours: 4,
        delieveryMethod: 'ONLINE',
        completionStatus: 'INCOMPLETED',
        category: 'SAFETY',
        description: '기본 안전 교육',
        complementationDate: '',
      },
    ]);
  }),
  http.get(PROFILE_ENDPOINTS.PROGRESS_TRAINING, ({ request }) => {
    if (shouldError(request)) return error('Failed to load progress training', 500);
    return ok([
      {
        trainingId: 'tr-002',
        trainingName: '품질 교육',
        trainingStatus: 'IN_PROGRESS',
        durationHours: 3,
        delieveryMethod: 'OFFLINE',
        completionStatus: 'INCOMPLETED',
        category: 'QUALITY',
        description: '품질 기준 교육',
        complementationDate: '',
      },
    ]);
  }),
  http.get(PROFILE_ENDPOINTS.COMPLETED_TRAINING, ({ request }) => {
    if (shouldError(request)) return error('Failed to load completed training', 500);
    return ok([
      {
        trainingId: 'tr-003',
        trainingName: 'ERP 사용법',
        trainingStatus: 'COMPLETED',
        durationHours: 2,
        delieveryMethod: 'ONLINE',
        completionStatus: 'COMPLETED',
        category: 'SYSTEM',
        description: 'ERP 기본 사용법',
        complementationDate: '2026-01-05',
      },
    ]);
  }),
  http.post(PROFILE_ENDPOINTS.EDIT_PROFILE, ({ request }) => {
    if (shouldError(request)) return error('Failed to update profile', 500);
    return okNoData();
  }),
];
