'use client';

import { useTranslations } from 'next-intl';
import { useRole } from '@/app/hooks/useRole';
import { ActionCard } from './ActionCard';
import { allActions } from '../dashboard.utils';
import { hasRole } from '@/lib/authz/policy';

const QuickActions = () => {
  const t = useTranslations('dashboard.quickActions');
  const role = useRole();
  const visibleActions = allActions.filter((a) => hasRole(a.roles, role));
  return (
    <div className="card-base p-6">
      <div className="flex items-center space-x-2 mb-6">
        <i className="ri-flashlight-line text-blue-600 text-lg"></i>
        <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
      </div>

      <div className="space-y-3 ">
        {visibleActions.map(({ key, icon, color, href }, index) => (
          <ActionCard key={index} actionKey={key} icon={icon} color={color} href={href} />
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
