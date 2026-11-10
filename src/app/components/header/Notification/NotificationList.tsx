import { useTranslations } from 'next-intl';
import { type NotificationData } from '../types/NotificatioApiType';

interface NotificationListProps {
  notifications: NotificationData[];
  onNotificationClick: (notificationId: string) => void;
}

interface SourceConfig {
  color: string;
  icon: string;
  /** 메시지 notification.source 의 키 */
  labelKey: NotificationData['source'] | 'unknown';
}

const UNKNOWN_CONFIG: SourceConfig = {
  color: 'bg-green-500',
  icon: 'ri-shopping-cart-line',
  labelKey: 'unknown',
};

/** 알림 출처 표시. 서버가 모르는 출처를 보내면 undefined 라 Partial 로 두고 기본값을 쓴다 */
const getSourceConfig = (source: NotificationData['source']): SourceConfig => {
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

export default function NotificationList({
  notifications,
  onNotificationClick,
}: NotificationListProps) {
  const t = useTranslations('notification');
  // 알람 없을 때
  if (notifications.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
          <i className="ri-notification-off-line text-3xl text-gray-400"></i>
        </div>
        <p className="text-sm font-medium text-gray-500">{t('empty')}</p>
        <p className="text-xs text-gray-400 mt-1">{t('emptyHint')}</p>
      </div>
    );
  }

  // 알람 있을 때
  return (
    <div className="max-h-96 overflow-y-auto">
      {notifications.map((notfication) => {
        const config = getSourceConfig(notfication.source);

        return (
          <div
            key={notfication.notificationId}
            onClick={() => onNotificationClick(notfication.notificationId)}
            className={`min-h-20 overflow-hidden py-3 px-5 border-b border-gray-100 cursor-pointer transition-all duration-200 group flex items-center justify-between ${
              !notfication.isRead ? 'bg-white hover:bg-blue-50' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3 w-full">
              {/* 아이콘 */}
              <div
                className={`${config.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
              >
                <i className={`${config.icon} text-white text-lg`}></i>
              </div>

              {/* 알람 내용 & 시간 */}
              <div className="flex-1 min-w-0 flex flex-col pl-0.5 pt-2 pb-1">
                {/* 제목 */}
                <h4
                  className={`text-sm truncate pr-2 ${
                    !notfication.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
                  }`}
                >
                  {notfication.notificationTitle}
                </h4>

                <p
                  className={`text-xs truncate max-w-58 ${
                    !notfication.isRead ? 'text-gray-700 font-medium' : 'text-gray-600'
                  }`}
                >
                  {notfication.notificationMessage}
                </p>

                {/* 시간 */}
                <div className="flex items-center text-xs text-gray-400 mt-1">
                  <i className="ri-time-line mr-1"></i>
                  {formatDateTime(notfication.createdAt)}
                </div>
              </div>

              {/* 라벨 (오른쪽 끝에 배치) */}
              <div
                className={`${config.color} text-white text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0`} // self-start로 상단 정렬 및 flex-shrink-0으로 공간 확보
              >
                {t(`source.${config.labelKey}`)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
