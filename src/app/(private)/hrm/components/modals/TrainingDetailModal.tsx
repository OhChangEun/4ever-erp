'use client';

import { useQuery } from '@tanstack/react-query';
import { type ModalProps } from '@/app/components/common/modal/types';
import { fetchTrainingDetail } from '@/app/(private)/hrm/api/hrm.api';
import { type TrainingDetailResponse } from '@/app/(private)/hrm/types/HrmTrainingApiType';
import { formatDateTime } from '@/app/utils/date';
import { trainingKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { useTranslations } from 'next-intl';

interface TrainingDetailModalProps extends ModalProps {
  employeeId: string;
}

export default function TrainingDetailModal({ employeeId }: TrainingDetailModalProps) {
  const t = useTranslations('hrm');
  // 이력의 완료, 미완료 글자는 공통 상태 문구(status.COMPLETED, status.INCOMPLETED)
  const tStatus = useTranslations('status');
  const { data, isLoading, isError } = useQuery<TrainingDetailResponse>({
    queryKey: trainingKeys.detail(employeeId),
    meta: { listOnNotFound: trainingKeys.lists() },
    queryFn: () => fetchTrainingDetail(employeeId),
    enabled: !!employeeId,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="text-center text-gray-500">{t('training.detailLoading')}</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="text-center text-red-500">{t('common.loadFailed')}</div>
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
        <InfoItem label={t('common.name')} value={data.employeeName} />
        <InfoItem label={t('common.department')} value={data.department} />
        <InfoItem label={t('common.position')} value={data.position} />
        <InfoItem
          label={t('training.lastTrainingDate')}
          value={formatDateTime(data.lastTrainingDate)}
        />
      </div>

      {/* 교육 카운트 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard color="green" count={completedCount} label={t('training.completed')} />
        <SummaryCard color="blue" count={incompletedCount} label={t('training.incompleted')} />
        <SummaryCard
          color="red"
          count={data.requiredMissingCount}
          label={t('training.requiredMissing')}
        />
      </div>

      {/* 교육 이력 */}
      <h4 className="text-md font-semibold text-gray-900 mb-3">{t('training.history')}</h4>

      {data.programHistory.length === 0 ? (
        <div className="text-gray-500 text-sm">{t('training.noHistory')}</div>
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
                  {tStatus(record.programStatus === 'COMPLETED' ? 'COMPLETED' : 'INCOMPLETED')}
                </span>
              </div>

              <div className="text-sm text-gray-600">
                {record.programStatus === 'COMPLETED' && record.completedAt && (
                  <div>{t('common.completedAt', { date: record.completedAt })}</div>
                )}
                {record.programStatus === 'INCOMPLETED' && (
                  <div>{t('training.incompleteState')}</div>
                )}
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
