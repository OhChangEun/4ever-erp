'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMesDetail } from '@/app/(private)/production/api/production.api';
import {
  useCompleteMes,
  useCompleteMesOperation,
  useStartMes,
  useStartMesOperation,
} from '@/app/(private)/production/api/production.mutations';
import { type ModalProps } from '@/app/components/common/modal/types';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Button, ModalStatusBox } from '@everp/ui';
import { mesKeys } from '@/app/(private)/production/api/production.keys';
import { useTranslations } from 'next-intl';

interface MesDetailProps extends ModalProps {
  mesId: string;
}

/** 결과 안내 문구 키(production.process.<키>). 글자는 그릴 때 바꾼다(언어를 바꿔도 맞게) */
type ResultMessageKey =
  | 'startMesSuccess'
  | 'startMesError'
  | 'completeMesSuccess'
  | 'completeMesError'
  | 'startOperationSuccess'
  | 'startOperationError'
  | 'completeOperationSuccess'
  | 'completeOperationError';

export default function MesDetail({ mesId, onClose }: MesDetailProps) {
  const t = useTranslations('production');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    key: ResultMessageKey;
  } | null>(null);

  // MES 상세 정보 조회
  const {
    data: mesDetail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: mesKeys.detail(mesId),
    meta: { listOnNotFound: mesKeys.lists() },
    queryFn: () => fetchMesDetail(mesId),
    enabled: !!mesId,
  });

  // mutation 과 무효화 범위(상세, 목록, 통계)는 production.mutations.ts 한 곳. 여기선 결과 메시지만.
  const startMesMutation = useStartMes({
    onSuccess: () => setMessage({ type: 'success', key: 'startMesSuccess' }),
    onError: () => setMessage({ type: 'error', key: 'startMesError' }),
  });
  const completeMesMutation = useCompleteMes({
    onSuccess: () => setMessage({ type: 'success', key: 'completeMesSuccess' }),
    onError: () => setMessage({ type: 'error', key: 'completeMesError' }),
  });
  const startOperationMutation = useStartMesOperation({
    onSuccess: () => setMessage({ type: 'success', key: 'startOperationSuccess' }),
    onError: () => setMessage({ type: 'error', key: 'startOperationError' }),
  });
  const completeOperationMutation = useCompleteMesOperation({
    onSuccess: () => setMessage({ type: 'success', key: 'completeOperationSuccess' }),
    onError: () => setMessage({ type: 'error', key: 'completeOperationError' }),
  });

  const formatDuration = (hours: number): string => {
    if (!hours || hours === 0) return '-';
    if (hours < 1) {
      return t('process.minutes', { minutes: Math.round(hours * 60) });
    }
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0
      ? t('process.hoursMinutes', { hours: wholeHours, minutes })
      : t('process.hours', { hours: wholeHours });
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <i className="ri-loader-4-line animate-spin text-3xl text-gray-400"></i>
        <p className="mt-3 text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  // 조회 실패(목록에 없는 건의 404 포함). 보일 상세가 없어 닫기는 모달을 닫는다
  if (isError || !mesDetail) {
    return <ModalStatusBox type="error" message={t('common.loadFailed')} onClose={onClose} />;
  }

  // 현재 진행 중인 Mutation이 있는지 확인
  const isProcessing =
    startMesMutation.isPending ||
    completeMesMutation.isPending ||
    startOperationMutation.isPending ||
    completeOperationMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl border border-gray-100">
      <div className="p-6 md:p-8 space-y-6">
        {/* 상태 메시지 */}
        {message && (
          <div
            className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            <i
              className={`mr-2 ${message.type === 'success' ? 'ri-check-line' : 'ri-close-circle-line'}`}
            ></i>
            {t(`process.${message.key}`)}
          </div>
        )}

        {/* MES 전체 제어 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-4">
          <div className="flex justify-between items-start flex-col sm:flex-row sm:items-center">
            <h4 className="text-xl font-bold text-gray-900 mb-2 sm:mb-0">
              {t('process.workOrder', { number: mesDetail.mesNumber })}
            </h4>
            <StatusLabel statusCode={mesDetail.statusCode} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
            <div>
              <div className="text-xs text-gray-500">{t('common.productName')}</div>
              <div className="text-sm font-medium text-gray-900">{mesDetail.productName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('common.quantity')}</div>
              <div className="text-sm font-medium text-gray-900">
                {mesDetail.quantity} {mesDetail.uomName}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('common.progress')}</div>
              <div className="text-sm font-bold text-blue-600">{mesDetail.progressPercent}%</div>
            </div>
            <div className="flex justify-end items-center space-x-3">
              <Button
                label={t('process.startMes')}
                disabled={!mesDetail.canStartMes || isProcessing}
                onClick={() => startMesMutation.mutate(mesId)}
              />
              <Button
                label={t('process.completeMes')}
                disabled={!mesDetail.canCompleteMes || isProcessing}
                onClick={() => completeMesMutation.mutate(mesId)}
              />
            </div>
          </div>
        </div>

        {/* 공정별 상세 */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {t('process.operationsTitle')}
          </h4>
          <div className="space-y-4">
            {mesDetail.operations.map((operation) => (
              <div
                key={operation.mesOperationLogId}
                className={`border-l-4 border border-gray-200 bg-white rounded-lg p-5 transition-all duration-200
                  ${operation.statusCode === 'COMPLETED' ? 'border-l-green-400' : ''}
                  ${operation.statusCode === 'IN_PROGRESS' ? 'border-l-blue-500' : ''}
                  ${operation.statusCode !== 'COMPLETED' && operation.statusCode !== 'IN_PROGRESS' ? 'border-l-gray-200' : ''}`}
              >
                <div className="flex items-center justify-between mb-3 border-b pb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-md font-bold text-gray-900">
                        {operation.operationName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t('process.sequence', { sequence: operation.sequence })}
                      </div>
                    </div>
                  </div>
                  <StatusLabel statusCode={operation.statusCode} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <div className="text-xs text-gray-500">{t('process.manager')}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {operation.manager?.name || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('process.startedAt')}</div>
                    <div className="text-sm text-gray-900">{operation.startedAt || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('process.finishedAt')}</div>
                    <div className="text-sm text-gray-900">{operation.finishedAt || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('process.duration')}</div>
                    <div className="text-sm text-gray-900">
                      {formatDuration(operation.durationHours)}
                    </div>
                  </div>
                </div>

                {/* 공정 제어 버튼 */}
                <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                  <button
                    onClick={() =>
                      startOperationMutation.mutate({
                        mesId,
                        operationId: operation.mesOperationLogId,
                      })
                    }
                    disabled={!operation.canStart || isProcessing}
                    className={`px-4 py-1.5 text-sm rounded-md border transition duration-150 
                      ${
                        operation.canStart && !isProcessing
                          ? 'border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer'
                          : 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                      }`}
                  >
                    <i className="ri-play-line mr-1"></i>
                    {t('process.startOperation')}
                  </button>
                  <button
                    onClick={() =>
                      completeOperationMutation.mutate({
                        mesId,
                        operationId: operation.mesOperationLogId,
                      })
                    }
                    disabled={!operation.canComplete || isProcessing}
                    className={`px-4 py-1.5 text-sm rounded-md border transition duration-150 
                      ${
                        operation.canComplete && !isProcessing
                          ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                          : 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                      }`}
                  >
                    <i className="ri-check-line mr-1"></i>
                    {t('process.completeOperation')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
