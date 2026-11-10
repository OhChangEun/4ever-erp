import { type ModalProps } from '@/app/components/common/modal/types';
import { fetchPositionsDetail } from '@/app/(private)/hrm/api/hrm.api';
import { useQuery } from '@tanstack/react-query';
import { type EmployeeSummary, type PositionDetailResponse } from '../../types/HrmPositionsApiType';
import { positionKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { useTranslations } from 'next-intl';

interface PositionDetailModalProps extends ModalProps {
  positionId: string;
}

export function PositionDetailModal({ positionId }: PositionDetailModalProps) {
  const t = useTranslations('hrm');
  const { data: positionData } = useQuery<PositionDetailResponse>({
    queryKey: positionKeys.detail(positionId),
    queryFn: () => fetchPositionsDetail(positionId),
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('positions.headcount')}
        </label>
        <div className="text-sm text-gray-900">
          {positionData && t('common.people', { count: positionData.headCount })}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('positions.salary')}
        </label>
        <div className="text-sm text-gray-900">{positionData?.payment}</div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('positions.employees')}
        </label>
        <div className="space-y-2">
          {positionData?.employees.map((emp: EmployeeSummary) => (
            <div key={emp.employeeId} className="flex justify-between text-sm">
              <span>{emp.employeeName}</span>
              <span className="text-gray-500">
                {emp.department} ({emp.hireDate})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
