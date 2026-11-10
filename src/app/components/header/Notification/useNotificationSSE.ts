'use client';

import { useEffect, useRef, useState } from 'react';
import { NOTIFICATION_ENDPOINTS } from '@/lib/api/notification.endpoints';
import { useQueryClient } from '@tanstack/react-query';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useAuthStore } from '@/store/authStore';
import { notificationKeys } from '@/app/components/header/header.keys';

interface Alarm {
  alarmId: string;
  alarmType: string;
  targetId: string;
  title: string;
  message: string;
  linkId: string;
  linkType: string;
}

/**
 * 연결 오류 종류. 글자는 부르는 쪽이 t(`notification.sseError.${error}`) 로 꺼낸다(훅은 글자를 만들지 않는다)
 */
export type NotificationSseError =
  'unauthorized' | 'connectFailed' | 'parseAlarm' | 'parseUnreadCount' | 'connection';

interface UseNotificationSSEOptions {
  enabled?: boolean;
  onAlarm?: (alarm: Alarm) => void;
  onUnreadCountChange?: (count: number) => void;
}

export function useNotificationSSE({
  enabled = true,
  onAlarm,
  onUnreadCountChange,
}: UseNotificationSSEOptions) {
  const { userInfo } = useAuthStore();
  const userId = userInfo?.id ? String(userInfo.id) : '';
  const sseEnabled = enabled && process.env.NEXT_PUBLIC_SSE_ENABLED === 'true';

  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const [error, setError] = useState<NotificationSseError | null>(null);

  useEffect(() => {
    if (!sseEnabled || !userId) {
      console.info('[SSE] Not connecting: enabled is false or userId is missing.', { userId });

      // 기존 연결이 있다면 종료합니다.
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const connectSSE = async () => {
      const url = NOTIFICATION_ENDPOINTS.SUBSCRIBE;
      console.info('[SSE] Connecting to:', url);

      try {
        // 같은 출처의 /api/proxy 로 붙어 세션 쿠키가 자동으로 간다. Bearer 는 프록시가 서버에서 붙인다.
        // 예전엔 브라우저 저장소의 토큰(BFF 전환 뒤엔 없음)으로 `Bearer null` 을 보냈다
        await fetchEventSource(url, {
          signal: abortController.signal,
          onopen: async (response) => {
            if (response.ok) {
              console.info('[SSE] Connection opened successfully');
              setError(null);
            } else if (response.status === 401) {
              setError('unauthorized');
              throw new Error('Unauthorized');
            } else {
              setError('connectFailed');
              throw new Error('Failed to connect');
            }
          },
          onmessage: (event) => {
            console.log('[SSE] Message received:', event);

            // event.event는 이벤트 타입 (keepalive, alarm, unreadCount)
            switch (event.event) {
              case 'keepalive':
                console.log('[SSE] Keepalive:', event.data);
                break;

              case 'alarm':
                try {
                  const alarm: Alarm = JSON.parse(event.data);
                  void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
                  onAlarm?.(alarm);
                } catch (err) {
                  console.error('[SSE] Failed to parse alarm:', err);
                  setError('parseAlarm');
                }
                break;

              case 'unreadCount':
                try {
                  const count = parseInt(event.data, 10);
                  onUnreadCountChange?.(count);
                } catch (err) {
                  console.error('[SSE] Failed to parse unread count:', err);
                  setError('parseUnreadCount');
                }
                break;

              default:
                console.log('[SSE] Unknown event type:', event.event);
            }
          },
          onerror: (err) => {
            console.error('[SSE] Error:', err);
            setError('connection');
            throw err; // 재연결 시도를 멈추고 싶다면 throw
          },
        });
      } catch (err) {
        console.error('[SSE] Connection error:', err);
      }
    };

    void connectSSE();

    return () => {
      console.info('[SSE] Closing connection');
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, [sseEnabled, userId, userInfo, queryClient, onAlarm, onUnreadCountChange]);
  return {
    disconnect: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    },
    error,
  };
}
