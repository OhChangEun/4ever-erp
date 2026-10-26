'use client';

import { useQuery } from '@tanstack/react-query';
import { ModalProps } from '@/app/components/common/modal/types';
import { fetchTrainingDetail } from '@/app/(private)/hrm/api/hrm.api';
import { TrainingDetailResponse } from '@/app/(private)/hrm/types/HrmTrainingApiType';
import { formatDateTime } from '@/app/utils/date';
import { trainingKeys } from '@/app/(private)/hrm/api/hrm.keys';

interface TrainingDetailModalProps extends ModalProps {
  employeeId: string;
}

export default function TrainingDetailModal({ employeeId }: TrainingDetailModalProps) {
  const { data, isLoading, isError } = useQuery<TrainingDetailResponse>({
    queryKey: trainingKeys.detail(employeeId),
    queryFn: () => fetchTrainingDetail(employeeId),
    enabled: !!employeeId,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="text-center text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="text-center text-red-500">데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  // 완료된 교육 개수
  const completedCount = data.programHistory.filter(
    (record) => record.programStatus === 'COMPLETED',
  ).length;

  // 미완료 교육 개수
  const incompletedCount = data.programHistory.filter(
    (record) => record.programStatus === 'INCOMPLETED',
  ).length;

  return (
    <>
      {/* 직원 기본 정보 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <InfoItem label="이름" value={data.employeeName} />
        <InfoItem label="부서" value={data.department} />
        <InfoItem label="직급" value={data.position} />
        <InfoItem label="마지막 교육일" value={formatDateTime(data.lastTrainingDate)} />
      </div>

      {/* 교육 카운트 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard color="green" count={completedCount} label="완료된 교육" />
        <SummaryCard color="blue" count={incompletedCount} label="미완료 교육" />
        <SummaryCard color="red" count={data.requiredMissingCount} label="필수 교육 미완료" />
      </div>

      {/* 교육 이력 */}
      <h4 className="text-md font-semibold text-gray-900 mb-3">교육 이력</h4>

      {data.programHistory.length === 0 ? (
        <div className="text-gray-500 text-sm">교육 이력이 없습니다.</div>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {data.programHistory.map((record, idx: number) => (
            <div key={idx} className="border p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900">{record.programName}</div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    record.programStatus === 'COMPLETED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {record.programStatus === 'COMPLETED' ? '완료' : '미완료'}
                </span>
              </div>

              <div className="text-sm text-gray-600">
                {record.programStatus === 'COMPLETED' && record.completedAt && (
                  <div>완료일: {record.completedAt}</div>
                )}
                {record.programStatus === 'INCOMPLETED' && <div>미완료 상태</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------- Sub Components ------------------- */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function SummaryCard({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: 'green' | 'blue' | 'red';
}) {
  const bg = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
  }[color];

  return (
    <div className={`p-4 text-center rounded-lg ${bg}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}
