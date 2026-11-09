'use client';

import { useRole } from '@/app/hooks/useRole';
import { ActionCard } from './ActionCard';
import { allActions } from '../dashboard.utils';

const QuickActions = () => {
  const role = useRole();
  // const role = 'ALL_ADMIN';
  // const role = 'MM_USER';
  // const role = 'SD_USER';
  // const role = 'IM_USER';
  // const role = 'FCM_USER';
  // const role = 'HRM_USER';
  // const role = 'PP_USER';
  const visibleActions = allActions.filter((a) => a.roles?.includes(role as string));
  return (
    <div className="card-base p-6">
      <div className="flex items-center space-x-2 mb-6">
        <i className="ri-flashlight-line text-blue-600 text-lg"></i>
        <h2 className="text-lg font-semibold text-gray-900">빠른 작업</h2>
      </div>

      <div className="space-y-3 ">
        {visibleActions.map((action, index) => (
          <ActionCard key={index} {...action} />
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
