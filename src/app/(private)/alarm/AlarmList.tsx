'use client';

import { useEffect, useRef, useState } from 'react';

interface Alarm {
  alarmId: string;
  alarmType: string;
  targetId: string;
  title: string;
  message: string;
  linkId: string;
  linkType: string;
}

export default function AlarmList() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const reconnectAttemptsRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // 백엔드 직접 연결 (CORS 설정 필요)
    const url =
      'http://localhost:8080/api/alarm/notifications/subscribe/019a2581-dd40-7cc8-b450-39df10062ec0';
    console.info('[AlarmList] mounting, subscribe url:', url);

    const connect = async () => {
      console.info(
        '[AlarmList] attempting to connect (attempt:',
        reconnectAttemptsRef.current + 1,
        ')',
      );

      // // Pre-flight check using fetch to see if endpoint is reachable
      // try {
      //   console.debug('[AlarmList] pre-flight: checking endpoint reachability...');
      //   const testResponse = await fetch(url, {
      //     method: 'GET', // HEAD 대신 GET 사용하여 실제 응답 확인
      //     credentials: 'include',
      //   }).catch((err) => {
      //     console.error('[AlarmList] pre-flight: fetch failed', err);
      //     return null;
      //   });

      //   if (testResponse) {
      //     const headers: Record<string, string> = {};
      //     testResponse.headers.forEach((value, key) => {
      //       headers[key] = value;
      //     });

      //     // 응답 본문 읽기 (백엔드가 무엇을 보냈는지 확인)
      //     const responseText = await testResponse.text();

      //     console.info('[AlarmList] pre-flight: endpoint response', {
      //       status: testResponse.status,
      //       statusText: testResponse.statusText,
      //       headers,
      //       contentType: testResponse.headers.get('content-type'),
      //       contentLength: testResponse.headers.get('content-length'),
      //       responseBody: responseText,
      //     });

      //     // Content-Length가 있으면 경고 (SSE는 스트리밍이므로 없어야 함)
      //     if (headers['content-length']) {
      //       console.warn(
      //         '[AlarmList] pre-flight: ⚠️ Content-Length detected! SSE should NOT have Content-Length header.',
      //         'This will cause premature connection closure. Backend needs to remove this header.',
      //       );
      //     }

      //     // SSE는 text/event-stream을 반환해야 함
      //     const contentType = testResponse.headers.get('content-type');
      //     if (contentType && !contentType.includes('text/event-stream')) {
      //       console.warn(
      //         '[AlarmList] pre-flight: unexpected content-type, expected text/event-stream, got:',
      //         contentType,
      //       );
      //     }
      //   } else {
      //     console.warn('[AlarmList] pre-flight: endpoint not reachable (network error)');
      //   }
      // } catch (e) {
      //   console.error('[AlarmList] pre-flight check exception:', e);
      // }

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      console.debug('[AlarmList] EventSource created, initial readyState:', eventSource.readyState);

      eventSource.onopen = () => {
        console.info('[AlarmList] SSE connection opened successfully');
        reconnectAttemptsRef.current = 0; // reset on successful connection
      };

      // 1. keepalive 이벤트: 연결 유지 및 초기 연결 확인
      eventSource.addEventListener('keepalive', (event) => {
        console.log('[AlarmList] ✅ keepalive event received:', event.data);
        // keepalive는 연결 확인용이므로 별도 처리 불필요
      });

      // 2. alarm 이벤트: 실제 알림 메시지 수신
      eventSource.addEventListener('alarm', (event) => {
        try {
          console.log('[AlarmList] alarm event received:', event.data);
          const alarm: Alarm = JSON.parse(event.data);
          console.debug('[AlarmList] parsed alarm:', alarm);
          setAlarms((prev) => {
            const next = [alarm, ...prev];
            console.debug('[AlarmList] alarms updated, count:', next.length);
            return next;
          });
        } catch (e) {
          console.error('[AlarmList] failed to parse alarm event', e, event.data);
        }
      });

      // 3. unreadCount 이벤트: 읽지 않은 알림 개수 업데이트
      eventSource.addEventListener('unreadCount', (event) => {
        try {
          const count = parseInt(event.data, 10);
          console.log('[AlarmList] unreadCount event received:', count);
          setUnreadCount(count);
        } catch (e) {
          console.error('[AlarmList] failed to parse unreadCount event', e, event.data);
        }
      });

      // 백엔드에서 name 없이 보낸 기본 메시지 수신 (디버깅용)
      eventSource.onmessage = (event) => {
        console.log('[AlarmList] default message received (no event name):', event.data);
      };

      eventSource.onerror = (err) => {
        const readyState = eventSource.readyState;
        const readyStateLabels = ['CONNECTING', 'OPEN', 'CLOSED'];

        // 타임아웃인지 일반 에러인지 구분
        const isTimeout = readyState === EventSource.CLOSED;

        console.error('[AlarmList] sse error occurred', {
          error: err,
          readyState,
          readyStateLabel: readyStateLabels[readyState] || 'UNKNOWN',
          url: eventSource.url,
          withCredentials: eventSource.withCredentials,
          possibleTimeout: isTimeout,
        });

        // 재연결은 브라우저 EventSource 기본 동작에 맡긴다(직접 재연결하던 코드는 주석으로만 남아 있어 지웠다)
      };
    };

    void connect();

    return () => {
      console.info('[AlarmList] unmounting, closing SSE');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold">알람</h2>
        {unreadCount > 0 && (
          <span className="ml-2 px-2 py-1 bg-red-500 text-white text-sm rounded-full">
            {unreadCount}
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {alarms.map((alarm) => (
          <li key={alarm.alarmId} className="p-3 bg-gray-100 rounded-lg">
            <div className="font-semibold">{alarm.title}</div>
            <div className="text-sm text-gray-600">{alarm.message}</div>
            <div className="text-xs text-gray-400 mt-1">{alarm.alarmType}</div>
          </li>
        ))}
      </ul>
      {alarms.length === 0 && <div className="text-center text-gray-500 py-8">알림이 없습니다</div>}
    </div>
  );
}
