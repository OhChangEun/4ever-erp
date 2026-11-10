import { useTranslations } from 'next-intl';
import { Button } from '@everp/ui';

interface NotificationHeaderProps {
  notificationCount: number;
  onReadAll: () => void;
}

// 헤더 컴포넌트
export default function NotificationHeader({
  notificationCount,
  onReadAll,
}: NotificationHeaderProps) {
  const t = useTranslations('notification');
  return (
    <div className="pl-5 pr-2.5 py-3 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <i className="text-lg pt-1 ri-notification-3-fill text-blue-500"></i>
          <h3 className="text-[17px] font-semibold text-gray-700">{t('title')}</h3>
        </div>
        {notificationCount > 0 && (
          <Button label={t('readAll')} size="sm" variant="ghost" onClick={onReadAll} />
        )}
      </div>
    </div>
  );
}
