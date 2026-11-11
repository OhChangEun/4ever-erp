'use client';

import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ErrorBoundary, useCloseOnEscape } from '@everp/ui';
import { fetchNotificationCounts } from '@/lib/api/notification.api';
import { notificationKeys } from '../header.keys';
import { SSE_RECONNECT_MS, useNotificationSSE } from './useNotificationSSE';

// 팝오버 내용(목록, 읽음 처리, 상태 상자)은 누를 때 받는다. 사이드바는 모든 화면 첫 로드에 실린다.
// 누른 뒤에만 그려 서버 렌더가 없으므로 next/dynamic 대신 React.lazy 를 쓴다. 청크를 못 받으면 아래 오류 경계로 온다
// (vitest 에서 next/dynamic 은 pages 라우터 구현으로 풀려, 실패를 오류 경계로 던지지 않고 loading 에 넘긴다. 앱과 달라진다)
const NotificationDropdown = lazy(() => import('./NotificationDropdown'));

const BADGE_MAX = 99;

interface NotificationBellProps {
  isExpanded: boolean;
}

/**
 * 사이드바의 알림 버튼과 안 읽은 수 뱃지. 누르면 목록 팝오버가 사이드바 옆에 뜬다(알림 UI 연결 카드).
 * 팝오버 틀(dialog)과 닫기(Esc, 바깥 누름, 포커스 복귀)는 여기 있다. 내용 청크를 받는 중이거나 못 받았어도 닫을 수 있다.
 * 틀은 버튼 바로 뒤 DOM 에 그리고 CSS 로 사이드바 오른쪽에 붙인다. portal 을 쓰지 않아 Tab 순서가 버튼, 목록, 프로필로
 * 이어진다. floating-ui 의 FloatingFocusManager 를 쓰면 드롭다운이 있는 화면 7곳의 첫 로드가 2.9KB 는다(카드 결정 16).
 */
export default function NotificationBell({ isExpanded }: NotificationBellProps) {
  const t = useTranslations('notification');
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusPanel = () => panelRef.current?.focus();

  const { connected } = useNotificationSSE();
  // SSE 가 붙어 있으면 새 알림이 올 때만 다시 받는다. 꺼져 있거나 끊겼으면 60초마다
  const refetchInterval = connected ? false : SSE_RECONNECT_MS;
  const { data, isError } = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => fetchNotificationCounts('UNREAD'),
    refetchInterval,
  });
  // 조회에 실패하면 옛 숫자를 보이지 않는다. 뱃지만 숨기고 버튼은 남긴다
  const unread = isError ? undefined : data?.count;

  // 안 읽은 수가 늘면 role=status 로 한 번 알린다. 직전 값을 state 로 들고 렌더 중에 비교한다(effect 없이).
  // 줄어들면 문구를 비워, 같은 수로 다시 늘어도 글자가 바뀌어 또 읽힌다
  const [seen, setSeen] = useState<number | undefined>(undefined);
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);
  if (unread !== undefined && unread !== seen) {
    setSeen(unread);
    setArrivedAt(seen !== undefined && unread > seen ? unread : null);
  }

  // Esc 로 닫으면 포커스를 버튼으로 돌려준다
  useCloseOnEscape(open, () => {
    buttonRef.current?.focus();
    setOpen(false);
  });

  useEffect(() => {
    if (!open) return;
    // 열리면 포커스를 팝오버로 옮긴다(낭독기가 "알림" 대화상자를 읽는다)
    panelRef.current?.focus();
    // 바깥을 누르면 닫는다. 버튼은 스스로 여닫으므로 버튼과 팝오버를 감싼 영역 밖만 본다
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (!wrapperRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const badge = unread ? (unread > BADGE_MAX ? `${BADGE_MAX}+` : String(unread)) : null;

  return (
    <div ref={wrapperRef} className="relative shrink-0 px-2 py-1.5">
      <button
        ref={buttonRef}
        type="button"
        // 이름은 "알림, 안 읽은 알림 3개". 수를 못 받았으면 "알림"
        aria-label={unread === undefined ? t('title') : t('bellLabel', { count: unread })}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        title={!isExpanded ? t('title') : undefined}
        className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <i aria-hidden="true" className="ri-notification-3-line text-base shrink-0 text-gray-400" />
        <span
          className={`whitespace-nowrap ${
            isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
          }`}
        >
          {t('title')}
        </span>
      </button>
      {/* 뱃지는 버튼 밖에 겹쳐 둔다. 버튼 안에 두면 보이는 글자가 "알림 3"이 돼 이름("알림, 안 읽은 알림 3개")에
          그대로 들어 있지 않다(WCAG 2.5.3, axe label-content-name-mismatch). 누름은 아래 버튼이 받는다 */}
      {badge && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute min-w-5 h-5 px-1.5 rounded-full bg-blue-500 text-white text-[11px] font-medium leading-5 text-center tabular-nums ${
            isExpanded ? 'right-4 top-1/2 -translate-y-1/2' : 'left-8 top-0'
          }`}
        >
          {badge}
        </span>
      )}
      <span role="status" className="sr-only">
        {arrivedAt === null ? '' : t('newArrived', { count: arrivedAt })}
      </span>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          tabIndex={-1}
          role="dialog"
          aria-label={t('title')}
          // 사이드바 오른쪽, 알림 버튼 줄에 아래를 맞춘다. 사이드바(z-sidebar) 안이라 본문 위에 뜬다.
          // max-w 는 화면 폭에서 펼친 사이드바(224px), 간격(12px), 오른쪽 여백(8px)을 뺀 값. 좁은 화면에서도 화면 안에 남는다
          className="absolute left-full bottom-0 ml-3 w-96 max-w-[calc(100vw-15.25rem)] max-h-[calc(100vh-1rem)] overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 focus:outline-none"
        >
          {/* 내용 청크를 못 받거나(오프라인 등) 그리다 깨져도 이 틀 안에만 실패를 보인다.
              사이드바는 (private)/error.tsx 경계 밖이라 그냥 두면 앱 전체 오류 화면이 된다 */}
          <ErrorBoundary
            name="notification-popover"
            fallback={() => (
              <p role="alert" className="p-4 text-sm text-gray-700">
                {t('loadFailed')}
              </p>
            )}
          >
            <Suspense fallback={<p className="p-4 text-sm text-gray-500">{t('loading')}</p>}>
              <NotificationDropdown
                unreadCount={unread}
                refetchInterval={refetchInterval}
                focusPanel={focusPanel}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
