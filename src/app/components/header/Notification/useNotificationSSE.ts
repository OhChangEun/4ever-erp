'use client';

import { useEffect, useState } from 'react';
import { NOTIFICATION_ENDPOINTS } from '@/lib/api/notification.endpoints';
import { useQueryClient } from '@tanstack/react-query';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useAuthStore } from '@/store/authStore';
import { notificationKeys } from '@/app/components/header/header.keys';

/** 끊기거나 못 붙었을 때 다시 붙기까지. 그동안 화면은 같은 간격으로 폴링한다(NotificationBell) */
export const SSE_RECONNECT_MS = 60_000;

// 401 은 세션이 끝난 것이라 다시 붙지 않는다. 폴링이 401 을 받아 로그인으로 보낸다(queryClient onUnauthorized)
const UNAUTHORIZED = new Error('SSE unauthorized');

interface UseNotificationSSEOptions {
  enabled?: boolean;
}

/**
 * 알림 SSE 구독(게이트웨이 GET /alarm/notifications/subscribe, AlarmController.java:127).
 * 이벤트는 keepalive(20초마다)와 alarm 이다(AlarmSendServiceImpl.java:80,126). unreadCount 는 게이트웨이에
 * 보내는 함수만 있고 부르는 곳이 없어, 와도 숫자를 믿지 않고 다시 받는다.
 * 새 알림이 오면 알림 키(목록, 안 읽은 수)만 무효화한다. 실패는 화면에 알리지 않고 connected 만 false 로 둔다.
 * `NEXT_PUBLIC_SSE_ENABLED=true` 일 때만 붙는다. 기본은 꺼짐(서버 목은 연결을 1.5초 뒤 닫는다).
 */
export function useNotificationSSE({ enabled = true }: UseNotificationSSEOptions = {}) {
  const userId = useAuthStore((state) => state.userInfo?.id);
  const sseEnabled =
    enabled && process.env.NEXT_PUBLIC_SSE_ENABLED === 'true' && userId !== undefined;
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sseEnabled) return;
    const abortController = new AbortController();
    const refetchNotifications = () =>
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });

    // 같은 출처의 /api/proxy 로 붙어 세션 쿠키가 자동으로 간다. Bearer 는 프록시가 서버에서 붙인다
    fetchEventSource(NOTIFICATION_ENDPOINTS.SUBSCRIBE, {
      signal: abortController.signal,
      onopen: async (response) => {
        if (response.status === 401) throw UNAUTHORIZED;
        // 200 이어도 이벤트 스트림이 아니면(오류 페이지 등) 연결된 것으로 치지 않는다
        if (!response.ok || !response.headers.get('content-type')?.startsWith('text/event-stream'))
          throw new Error(`SSE connect failed: ${response.status}`);
        setConnected(true);
        // 끊긴 동안(탭이 가려진 동안 포함) 놓친 알림을 받는다
        refetchNotifications();
      },
      onmessage: (event) => {
        if (event.event === 'alarm' || event.event === 'unreadCount') refetchNotifications();
      },
      // 서버가 닫으면(게이트웨이는 1시간 뒤) 오류로 넘겨 다시 붙는다. 그냥 두면 라이브러리가 구독을 끝낸다
      onclose: () => {
        throw new Error('SSE closed by server');
      },
      // 숫자를 돌려주면 라이브러리가 그만큼 뒤에 다시 붙는다. 던지면 멈춘다
      onerror: (error: unknown) => {
        setConnected(false);
        if (error === UNAUTHORIZED) throw error;
        return SSE_RECONNECT_MS;
      },
    }).catch(() => setConnected(false));

    return () => abortController.abort();
  }, [sseEnabled, userId, queryClient]);

  return { connected: sseEnabled && connected };
}
