import { useTranslations } from 'next-intl';
import { type NotificationData } from '../types/NotificationApiType';

interface NotificationListProps {
  notifications: NotificationData[];
  onNotificationClick: (notificationId: string) => void;
  /** 읽음 요청이 가는 중. 안 읽은 알림을 흐리게 하고 누름을 받지 않는다 */
  disabled?: boolean;
}

/** 화면이 아는 출처. 이름은 메시지 notification.source 에 있다 */
type KnownSource = 'PR' | 'SD' | 'IM' | 'FCM' | 'HRM' | 'PP' | 'CUS' | 'SUP';

interface SourceConfig {
  color: string;
  icon: string;
  /** 메시지 notification.source 의 키 */
  labelKey: KnownSource | 'unknown';
}

const UNKNOWN_CONFIG: SourceConfig = {
  color: 'bg-green-500',
  icon: 'ri-shopping-cart-line',
  labelKey: 'unknown',
};

/** 알림 출처 표시. 서버가 모르는 출처를 보내면 undefined 라 Partial 로 두고 기본값을 쓴다 */
const getSourceConfig = (source: string): SourceConfig => {
  const configs: Partial<Record<string, SourceConfig>> = {
    PR: { color: 'bg-blue-500', icon: 'ri-file-list-3-line', labelKey: 'PR' },
    SD: { color: 'bg-green-500', icon: 'ri-shopping-cart-line', labelKey: 'SD' },
    IM: { color: 'bg-yellow-500', icon: 'ri-inbox-line', labelKey: 'IM' },
    FCM: { color: 'bg-purple-500', icon: 'ri-building-line', labelKey: 'FCM' },
    HRM: { color: 'bg-pink-500', icon: 'ri-user-line', labelKey: 'HRM' },
    PP: { color: 'bg-indigo-500', icon: 'ri-box-3-line', labelKey: 'PP' },
    CUS: { color: 'bg-cyan-500', icon: 'ri-customer-service-2-line', labelKey: 'CUS' },
    SUP: { color: 'bg-orange-500', icon: 'ri-truck-line', labelKey: 'SUP' },
  };
  return configs[source] ?? UNKNOWN_CONFIG;
};

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
        const config = getSourceConfig(notification.source);
        const unread = !notification.isRead;
        // 버튼 안에도 들어가므로 span 만 쓴다
        const body = (
          <>
            <span
              aria-hidden="true"
              className={`${config.color} w-9 h-9 rounded-md flex items-center justify-center shrink-0`}
            >
              <i className={`${config.icon} text-white text-base`}></i>
            </span>
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
              {/* 출처는 회색 글자. 색 배경 흰 글자는 노랑, 청록, 주황에서 대비가 모자랐다 */}
              <span className="flex items-center justify-between gap-2 mt-1 text-xs text-gray-500">
                <span>{formatDateTime(notification.createdAt)}</span>
                <span>{t(`source.${config.labelKey}`)}</span>
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
