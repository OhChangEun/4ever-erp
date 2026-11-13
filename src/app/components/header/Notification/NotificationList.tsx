import { useTranslations } from 'next-intl';
import { type NotificationData } from '../types/NotificationApiType';

interface NotificationListProps {
  notifications: NotificationData[];
  onNotificationClick: (notificationId: string) => void;
  /** 읽음 요청이 가는 중. 안 읽은 알림을 흐리게 하고 누름을 받지 않는다 */
  disabled?: boolean;
}

/** 화면이 아는 출처. 이름은 메시지 notification.source 에 있다 */
const KNOWN_SOURCES = ['PR', 'SD', 'IM', 'FCM', 'HRM', 'PP', 'CUS', 'SUP'] as const;
type KnownSource = (typeof KNOWN_SOURCES)[number];

/** 서버가 모르는 출처를 보내면 '알 수 없음' */
const sourceKey = (source: string): KnownSource | 'unknown' =>
  KNOWN_SOURCES.find((known) => known === source) ?? 'unknown';

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

const ROW = 'w-full flex items-center gap-3 px-5 py-3 text-left';

export default function NotificationList({
  notifications,
  onNotificationClick,
  disabled = false,
}: NotificationListProps) {
  const t = useTranslations('notification');
  // 알람 없을 때
  if (notifications.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
          <i aria-hidden="true" className="ri-notification-off-line text-3xl text-gray-400"></i>
        </div>
        <p className="text-sm font-medium text-gray-500">{t('empty')}</p>
        <p className="text-xs text-gray-500 mt-1">{t('emptyHint')}</p>
      </div>
    );
  }

  // 알람 있을 때. Tailwind 가 목록 표시를 지워 Safari 가 list 로 안 읽으므로 role 을 적는다
  return (
    <ul role="list" className="max-h-96 overflow-y-auto divide-y divide-gray-100">
      {notifications.map((notification) => {
        const unread = !notification.isRead;
        // 버튼 안에도 들어가므로 span 만 쓴다
        const body = (
          <>
            <span className="flex-1 min-w-0">
              <span
                className={`block text-sm truncate ${
                  unread ? 'font-semibold text-gray-900' : 'text-gray-700'
                }`}
              >
                {unread && <span className="sr-only">{t('unread')} </span>}
                {notification.notificationTitle}
              </span>
              <span className="block text-xs text-gray-600 truncate">
                {notification.notificationMessage}
              </span>
              {/* 출처는 회색 글자 하나. 색 아이콘 타일은 지웠다(지침 12장 아이콘 세 곳, 같은 뜻을 두 번 말하지 않는다) */}
              <span className="flex items-center justify-between gap-2 mt-1 text-xs text-gray-500">
                <span>{formatDateTime(notification.createdAt)}</span>
                <span>{t(`source.${sourceKey(notification.source)}`)}</span>
              </span>
            </span>
            {unread && (
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            )}
          </>
        );

        return (
          <li key={notification.notificationId}>
            {unread ? (
              // 안 읽은 알림만 누를 수 있다(읽음 처리). disabled 속성은 포커스를 잃게 해서 aria-disabled 로 막는다
              <button
                type="button"
                aria-disabled={disabled}
                onClick={() => {
                  if (!disabled) onNotificationClick(notification.notificationId);
                }}
                className={`${ROW} cursor-pointer hover:bg-gray-50 focus-visible:-outline-offset-2 ${
                  disabled ? 'opacity-60' : ''
                }`}
              >
                {body}
              </button>
            ) : (
              <div className={ROW}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
