'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMesDetail,
  startMes,
  completeMes,
  startMesOperation,
  completeMesOperation,
} from '@/app/(private)/production/api/production.api';
import { ModalProps } from '@/app/components/common/modal/types';
import StatusLabel from '@/app/components/common/StatusLabel';
import Button from '@/app/components/common/Button';
import IconButton from '@/app/components/common/IconButton';

interface MesDetailProps extends ModalProps {
  mesId: string;
}

export default function MesDetail({ mesId }: MesDetailProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // MES 상세 정보 조회
  const {
    data: mesDetail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['mesDetail', mesId],
    queryFn: () => fetchMesDetail(mesId),
    enabled: !!mesId,
  });

  // MES 시작 Mutation
  const startMesMutation = useMutation({
    mutationFn: () => startMes(mesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesDetail', mesId] });
      setMessage({ type: 'success', text: 'MES 작업이 시작되었습니다.' });
    },
    onError: () => {
      setMessage({ type: 'error', text: 'MES 시작 중 오류가 발생했습니다.' });
    },
  });

  // MES 완료 Mutation
  const completeMesMutation = useMutation({
    mutationFn: () => completeMes(mesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesDetail', mesId] });
      setMessage({ type: 'success', text: 'MES 작업이 완료되었습니다.' });
    },
    onError: () => {
      setMessage({ type: 'error', text: 'MES 완료 중 오류가 발생했습니다.' });
    },
  });

  // 공정 시작 Mutation
  const startOperationMutation = useMutation({
    mutationFn: (operationId: string) => startMesOperation(mesId, operationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesDetail', mesId] });
      setMessage({ type: 'success', text: '공정이 시작되었습니다.' });
    },
    onError: () => {
      setMessage({ type: 'error', text: '공정 시작 중 오류가 발생했습니다.' });
    },
  });

  // 공정 완료 Mutation
  const completeOperationMutation = useMutation({
    mutationFn: (operationId: string) => completeMesOperation(mesId, operationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesDetail', mesId] });
      setMessage({ type: 'success', text: '공정이 완료되었습니다.' });
    },
    onError: () => {
      setMessage({ type: 'error', text: '공정 완료 중 오류가 발생했습니다.' });
    },
  });

  const formatDuration = (hours: number): string => {
    if (!hours || hours === 0) return '-';
    if (hours < 1) {
      return `${Math.round(hours * 60)}분`;
    }
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}시간 ${minutes}분` : `${wholeHours}시간`;
  };

  // const getStatusBadge = (statusCode: string) => {
  //   const statusConfig: Record<string, { label: string; class: string }> = {
  //     PLANNED: { label: '대기', class: 'bg-yellow-100 text-yellow-800' },
  //     IN_PROGRESS: { label: '진행중', class: 'bg-blue-100 text-blue-800' },
  //     COMPLETED: { label: '완료', class: 'bg-green-100 text-green-800' },
  //     ON_HOLD: { label: '보류', class: 'bg-red-100 text-red-800' },
  //   };
  //   const config = statusConfig[statusCode] || {
  //     label: statusCode,
  //     class: 'bg-gray-100 text-gray-800',
  //   };
  //   return (
  //     <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.class}`}>
  //       {config.label}
  //     </span>
  //   );
  // };

  // const getProcessStatusIcon = (statusCode: string) => {
  //   const icons: Record<string, string> = {
  //     COMPLETED: 'ri-checkbox-circle-fill text-green-600',
  //     IN_PROGRESS: 'ri-play-circle-fill text-blue-600',
  //     PLANNED: 'ri-time-line text-gray-400',
  //     ON_HOLD: 'ri-pause-circle-fill text-red-500',
  //   };
  //   return icons[statusCode] || 'ri-time-line text-gray-400';
  // };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <i className="ri-loader-4-line animate-spin text-3xl text-gray-400"></i>
        <p className="mt-3 text-gray-500">로딩 중...</p>
      </div>
    );
  }

  // 에러 발생
  if (isError || !mesDetail) {
    return (
      <div className="text-center py-12">
        <i className="ri-error-warning-line text-3xl text-red-400"></i>
        <p className="mt-3 text-red-500">데이터를 불러오는데 실패했습니다.</p>
      </div>
    );
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
            {message.text}
          </div>
        )}

        {/* MES 전체 제어 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-4">
          <div className="flex justify-between items-start flex-col sm:flex-row sm:items-center">
            <h4 className="text-xl font-bold text-gray-900 mb-2 sm:mb-0">
              작업지시: {mesDetail.mesNumber}
            </h4>
            <StatusLabel statusCode={mesDetail.statusCode} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
            <div>
              <div className="text-xs text-gray-500">제품명</div>
              <div className="text-sm font-medium text-gray-900">{mesDetail.productName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">수량</div>
              <div className="text-sm font-medium text-gray-900">
                {mesDetail.quantity} {mesDetail.uomName}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">진행률</div>
              <div className="text-sm font-bold text-blue-600">{mesDetail.progressPercent}%</div>
            </div>
            <div className="flex justify-end items-center space-x-3">
              <IconButton
                icon="ri-play-fill"
                label="MES 시작"
                disabled={!mesDetail.canStartMes || isProcessing}
                onClick={() => startMesMutation.mutate()}
              />
              <IconButton
                icon="ri-check-line"
                label="MES 시작"
                variant="green"
                disabled={!mesDetail.canCompleteMes || isProcessing}
                onClick={() => completeMesMutation.mutate()}
              />
            </div>
          </div>
        </div>

        {/* 공정별 상세 */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">공정별 상세 현황 및 제어</h4>
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
                      <div className="text-xs text-gray-500">공정 순서: {operation.sequence}</div>
                    </div>
                  </div>
                  <StatusLabel statusCode={operation.statusCode} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <div className="text-xs text-gray-500">담당자</div>
                    <div className="text-sm font-medium text-gray-900">
                      {operation.manager?.name || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">시작시간</div>
                    <div className="text-sm text-gray-900">{operation.startedAt || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">종료시간</div>
                    <div className="text-sm text-gray-900">{operation.finishedAt || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">소요시간</div>
                    <div className="text-sm text-gray-900">
                      {formatDuration(operation.durationHours)}
                    </div>
                  </div>
                </div>

                {/* 공정 제어 버튼 */}
                <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                  <button
                    onClick={() => startOperationMutation.mutate(operation.mesOperationLogId)}
                    disabled={!operation.canStart || isProcessing}
                    className={`px-4 py-1.5 text-sm rounded-md border transition duration-150 
                      ${
                        operation.canStart && !isProcessing
                          ? 'border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer'
                          : 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                      }`}
                  >
                    <i className="ri-play-line mr-1"></i>공정 시작
                  </button>
                  <button
                    onClick={() => completeOperationMutation.mutate(operation.mesOperationLogId)}
                    disabled={!operation.canComplete || isProcessing}
                    className={`px-4 py-1.5 text-sm rounded-md border transition duration-150 
                      ${
                        operation.canComplete && !isProcessing
                          ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                          : 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                      }`}
                  >
                    <i className="ri-check-line mr-1"></i>공정 완료
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
