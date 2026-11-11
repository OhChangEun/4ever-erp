import { http as mswHttp, HttpResponse } from 'msw';
import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/lib/api/openapi.gen';
import type { Schema } from '@/lib/api/contract';
import { API_BASE_URL } from '@/app/types/api';
import { NOTIFICATION_ENDPOINTS } from '@/lib/api/notification.endpoints';
import { makePage } from './utils';

/**
 * 알림 목(알림 UI 연결 카드). 목록, 안 읽은 수, 읽음 처리가 같은 상태를 본다(읽으면 안 읽은 수가 준다).
 * JSON 경로는 OpenAPI 계약에 묶인 `http` 로 쓴다. 틀린 필드는 tsc 가 막는다.
 * 경로와 파라미터는 게이트웨이 alarm/controller/AlarmController.java, 응답 모양은 알림 서버 사본 기준.
 */
type Notification = Schema<'NotificationData'>;

const http = createOpenApiHttp<paths>({ baseUrl: API_BASE_URL });
const OK = { status: 200, success: true, message: 'OK' } as const;

// 최신순. createdAt 은 서버 형식(yyyy-MM-dd'T'HH:mm:ss, 시간대 없음)
const seed = (): Notification[] => [
  {
    notificationId: 'ntf-001',
    notificationTitle: '발주 승인 요청',
    notificationMessage: 'PO-2026-001 승인 요청이 도착했습니다.',
    linkType: 'PURCHASE_ORDER',
    linkId: 'po-001',
    source: 'PR',
    createdAt: '2026-11-12T09:05:00',
    isRead: false,
  },
  {
    notificationId: 'ntf-002',
    notificationTitle: '재고 부족 경고',
    notificationMessage: 'ITEM-1002의 재고가 안전재고 이하입니다.',
    linkType: 'INSUFFICIENT_STOCK',
    linkId: 'item-1002',
    source: 'IM',
    createdAt: '2026-11-12T08:40:00',
    isRead: true,
  },
  {
    notificationId: 'ntf-003',
    notificationTitle: '견적 검토 요청',
    notificationMessage: 'QT-2026-014 견적 검토가 요청되었습니다.',
    linkType: 'QUOTATION',
    linkId: 'qt-014',
    source: 'SD',
    createdAt: '2026-11-11T17:20:00',
    isRead: false,
  },
  {
    notificationId: 'ntf-004',
    notificationTitle: '매입 전표 등록',
    notificationMessage: 'AP-2026-032 전표가 등록되었습니다.',
    linkType: 'PURCHASE_INVOICE',
    linkId: 'ap-032',
    source: 'FCM',
    createdAt: '2026-11-11T11:00:00',
    isRead: false,
  },
  {
    // 참조가 없는 알림. 알림 서버는 linkType, linkId 를 null 로 준다
    notificationId: 'ntf-005',
    notificationTitle: '휴가 승인',
    notificationMessage: '11월 14일 휴가 신청이 승인되었습니다.',
    linkType: null,
    linkId: null,
    source: 'HRM',
    createdAt: '2026-11-10T15:30:00',
    isRead: true,
  },
];

// 상태는 Authorization 값(로그인)별. 프록시가 세션 토큰을 Bearer 로 붙이므로 로그인마다 새 상태다.
// 브라우저 MSW 와 단위 테스트는 헤더가 없어 '' 하나를 같이 쓴다.
// shortcut: 로그인할 때마다 저장소가 하나씩 늘어난다(목 전용, 서버를 다시 띄우면 비워진다), 문제 되면 최근 N개만 남긴다
// shortcut: 브라우저 MSW 는 로그인을 바꿔도 같은 저장소라 앞 사용자의 읽음 상태가 남는다(개발용 목에서만), 문제 되면 로그아웃 때 resetAlarmMock
const stores = new Map<string, Notification[]>();
const storeOf = (request: Request): Notification[] => {
  const key = request.headers.get('authorization') ?? '';
  const existing = stores.get(key);
  if (existing) return existing;
  const created = seed();
  stores.set(key, created);
  return created;
};

/** 테스트가 끝날 때 처음 상태로 돌린다 */
export const resetAlarmMock = () => stores.clear();

export const alarmHandlers = [
  http.get('/alarm/notifications/list', ({ request, query, response }) => {
    const page = Number(query.get('page') ?? 0);
    const size = Number(query.get('size') ?? 20);
    const items = storeOf(request);
    return response(200).json({
      ...OK,
      data: {
        content: items.slice(page * size, page * size + size),
        page: makePage(page, size, items.length),
      },
    });
  }),
  http.get('/alarm/notifications/count', ({ request, query, response }) => {
    // 알림 서버 기본값이 UNREAD(NotificationController.java:110)
    const wantRead = query.get('status') === 'READ';
    const count = storeOf(request).filter((item) => item.isRead === wantRead).length;
    return response(200).json({ ...OK, data: { count } });
  }),
  http.patch('/alarm/notifications/all/read', ({ request, response }) => {
    const unread = storeOf(request).filter((item) => !item.isRead);
    for (const item of unread) item.isRead = true;
    return response(200).json({ ...OK, data: { processedCount: unread.length } });
  }),
  http.patch('/alarm/notifications/{notificationId}/read', ({ request, params, response }) => {
    // 없는 id 나 이미 읽은 알림은 0건 처리(알림 서버의 update 건수와 같다)
    const item = storeOf(request).find(
      (candidate) => candidate.notificationId === params.notificationId && !candidate.isRead,
    );
    if (item) item.isRead = true;
    return response(200).json({ ...OK, data: { processedCount: item ? 1 : 0 } });
  }),
  // SSE 는 JSON 계약 밖이라 msw 의 http 로 쓴다. NEXT_PUBLIC_SSE_ENABLED=true 일 때만 화면이 부른다.
  // 이벤트 이름은 게이트웨이 AlarmSendServiceImpl.java:80(keepalive), :126(alarm).
  // 0.5초 뒤 새 알림 하나를 상태에 넣고 알린 다음 1.5초에 닫는다(화면은 60초 뒤 다시 붙는다)
  mswHttp.get(NOTIFICATION_ENDPOINTS.SUBSCRIBE, ({ request }) => {
    const items = storeOf(request);
    const encoder = new TextEncoder();
    let timers: ReturnType<typeof setTimeout>[] = [];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, data: string) =>
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        send('keepalive', 'connected');
        timers = [
          setTimeout(() => {
            const alarmId = `ntf-sse-${items.length + 1}`;
            const title = '구매 요청 승인';
            const message = 'PR-2026-021 구매 요청이 승인되었습니다.';
            items.unshift({
              notificationId: alarmId,
              notificationTitle: title,
              notificationMessage: message,
              linkType: 'PURCHASE_REQUISITION',
              linkId: 'pr-021',
              source: 'PR',
              createdAt: '2026-11-12T09:30:00',
              isRead: false,
            });
            send(
              'alarm',
              JSON.stringify({
                alarmId,
                alarmType: 'PR',
                targetId: 'user-001',
                title,
                message,
                linkId: 'pr-021',
                linkType: 'PURCHASE_REQUISITION',
              }),
            );
          }, 500),
          setTimeout(() => controller.close(), 1500),
        ];
      },
      // 화면이 먼저 끊으면 닫힌 스트림에 쓰지 않게 타이머를 지운다
      cancel() {
        for (const timer of timers) clearTimeout(timer);
      },
    });
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }),
];
