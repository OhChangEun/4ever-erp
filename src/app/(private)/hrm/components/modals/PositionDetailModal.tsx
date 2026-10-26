import { ModalProps } from '@/app/components/common/modal/types';
import { fetchPositionsDetail } from '@/app/(private)/hrm/api/hrm.api';
import { useQuery } from '@tanstack/react-query';
import { EmployeeSummary, PositionDetailResponse } from '../../types/HrmPositionsApiType';
import { positionKeys } from '@/app/(private)/hrm/api/hrm.keys';

interface PositionDetailModalProps extends ModalProps {
  positionId: string;
}

export function PositionDetailModal({ positionId }: PositionDetailModalProps) {
  const {
    data: positionData,
    isLoading,
    isError,
  } = useQuery<PositionDetailResponse>({
    queryKey: positionKeys.details(),
    queryFn: () => fetchPositionsDetail(positionId),
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">현재 인원</label>
        <div className="text-sm text-gray-900">{positionData?.headCount}명</div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">연봉</label>
        <div className="text-sm text-gray-900">{positionData?.payment}</div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">해당 직급 직원 목록</label>
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
