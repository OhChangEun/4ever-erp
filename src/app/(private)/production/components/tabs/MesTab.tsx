'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FetchMesListParams,
  MesListResponse,
  MesSummaryItem,
} from '@/app/(private)/production/types/MesListApiType';
import Dropdown from '@/app/components/common/Dropdown';
import { useQuery } from '@tanstack/react-query';
import {
  fetchMesList,
  fetchMesStatusDropdown,
  fetchMrpQuotationsDropdown,
} from '../../api/production.api';
import { useModal } from '@/app/components/common/modal/useModal';
import ProcessDetailModal from '../modals/ProcessDetailModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import Pagination from '@/app/components/common/Pagination';
import IconButton from '@/app/components/common/IconButton';

export default function MesTab() {
  const [selectedMesQuote, setSelectedMesQuote] = useState('');
  const [selectedMesStatus, setSelectedMesStatus] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { openModal } = useModal();
  // mrp 순소요 - 견적 드롭다운
  const { options: mrpQuotationOptions } = useDropdown(
    'mrpQuotationsDropdown',
    fetchMrpQuotationsDropdown,
  );

  const { options: mesStatusOptions } = useDropdown('mesStatusDropdown', fetchMesStatusDropdown);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<HTMLDivElement>(null);

  // 쿼리 파라미터 객체 생성
  const queryParams = useMemo(
    () => ({
      quotationId: selectedMesQuote,
      status: selectedMesStatus,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedMesQuote, selectedMesStatus, currentPage],
  );

  // API 호출 with query parameters
  const {
    data: mesResponse,
    isLoading,
    isError,
  } = useQuery<MesListResponse>({
    queryKey: ['mesList', queryParams],
    queryFn: ({ queryKey }) => fetchMesList(queryKey[1] as FetchMesListParams),
    staleTime: 1000,
  });

  // content 배열만 추출
  const mesListData: MesSummaryItem[] = mesResponse?.content || [];
  const pageInfo = mesResponse?.page;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; class: string }> = {
      PLANNED: { label: '대기', class: 'bg-gray-100 text-gray-600' },
      IN_PROGRESS: { label: '진행중', class: 'bg-blue-100 text-blue-800' },
      COMPLETED: { label: '완료', class: 'bg-green-100 text-green-800' },
      ON_HOLD: { label: '보류', class: 'bg-yellow-100 text-yellow-800' },
    };
    const config = statusConfig[status] || { label: status, class: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const handleShowProcessDetail = (mesId: string) => {
    openModal(ProcessDetailModal, { title: 'MES 현황', mesId: mesId, height: '800px' });
  };

  const getOperationStatus = (
    operationIndex: number,
    currentOperationNumber: number,
    status: string,
  ) => {
    // 모든 공정이 아직 시작 전일 때 (대기 상태)
    if (status === 'PLANNED' || status === 'PENDING') {
      return {
        icon: 'ri-circle-fill',
        class: 'text-gray-300',
        size: 'text-xs',
        lineClass: 'bg-gray-300',
      };
    }

    const operationNum = operationIndex + 1; // 1-based index

    // 현재 진행 중인 공정
    if (operationNum === currentOperationNumber) {
      return {
        icon: 'ri-play-circle-fill',
        class: 'text-blue-600',
        size: 'text-[16px]',
        lineClass: 'bg-blue-500',
      };
    }

    // 완료된 공정 (현재보다 이전)
    if (operationNum < currentOperationNumber) {
      return {
        icon: 'ri-checkbox-circle-fill',
        class: 'text-blue-400',
        size: 'text-[13px]',
        lineClass: 'bg-blue-400',
      };
    }

    // 아직 진행되지 않은 공정
    return {
      icon: 'ri-circle-fill',
      class: 'text-gray-300',
      size: 'text-[10px]',
      lineClass: 'bg-gray-300',
    };
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    const currentStep = currentStepRef.current;

    if (container && currentStep) {
      const containerHeight = container.clientHeight;
      const currentStepTop = currentStep.offsetTop - container.offsetTop; // 현재 공정의 상대적 위치
      const currentStepHeight = currentStep.clientHeight;

      // 중앙 정렬: (현재 공정의 중심) - (컨테이너의 절반)
      const scrollPosition = currentStepTop - containerHeight / 2 + currentStepHeight / 2;

      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth',
      });
    }
  }, [mesListData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex gap-3">
          <Dropdown
            placeholder="견적 선택"
            items={mrpQuotationOptions}
            value={selectedMesQuote}
            onChange={(quote: string) => {
              setSelectedMesQuote(quote);
              setCurrentPage(1);
            }}
            autoSelectFirst
          />
          <Dropdown
            placeholder="전체 상태"
            items={mesStatusOptions}
            value={selectedMesStatus}
            onChange={(status: string) => {
              setSelectedMesStatus(status);
            }}
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <i className="ri-loader-4-line animate-spin text-3xl"></i>
            <p className="mt-3 text-lg font-medium">MES 데이터를 로딩 중입니다...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-red-500">
            <i className="ri-error-warning-line text-3xl"></i>
            <p className="mt-3 text-lg font-medium">데이터를 불러오는데 실패했습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {mesListData && mesListData.length > 0 ? (
              mesListData.map((order) => {
                const currentOpNum = order.currentOperation || 0;

                return (
                  <div
                    key={order.mesId}
                    className="bg-white border border-gray-200 rounded-xl p-4 transition duration-200 hover:border-gray-300"
                  >
                    <div className="flex justify-between gap-6">
                      {/* 좌측: MES 번호, 제품 정보 및 상태 */}
                      <div className="w-45 shrink-0 flex flex-col gap-2.5">
                        <div className="flex items-center gap-1">
                          {getStatusBadge(order.status)}
                          <IconButton
                            label="공정 상세 보기"
                            icon="ri-search-line"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleShowProcessDetail(order.mesId)}
                          />
                        </div>

                        <div className="text-xl font-bold text-gray-800">
                          {order.quotationNumber}
                        </div>

                        <div>
                          <div className="text-[11px] text-gray-400 mb-0.5">제품</div>
                          <div className="text-sm font-semibold text-gray-700">
                            {order.productName}
                            <span className="ml-1 text-gray-400 font-normal text-xs">
                              {order.quantity} {order.uomName}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-gray-400 mb-0.5">기간</div>
                          <div className="text-xs text-gray-600">
                            {order.startDate}
                            <br />
                            {order.endDate}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                        <div className="flex items-center h-full">
                          {/* 공정 순서 (세로 방향) */}
                          <div
                            ref={scrollContainerRef}
                            className="flex flex-col gap-2 overflow-y-auto custom-scroll max-h-32 px-2 pr-3"
                          >
                            {order.sequence.map((operation, index) => {
                              const status = getOperationStatus(index, currentOpNum, order.status);
                              const isLast = index === order.sequence.length - 1;
                              const nextStatus =
                                !isLast &&
                                getOperationStatus(index + 1, currentOpNum, order.status);
                              const isCurrent = index + 1 === currentOpNum;
                              const isDone = index + 1 < currentOpNum && order.status !== 'PENDING';

                              return (
                                <div
                                  key={index}
                                  className="flex w-19 items-start gap-2"
                                  ref={isCurrent ? currentStepRef : null}
                                >
                                  {/* 아이콘 + 라인 */}
                                  <div className="relative flex flex-col items-center justify-start min-w-4">
                                    <i
                                      className={`${status.icon} ${status.class} ${status.size} z-local`}
                                    ></i>
                                    {!isLast && nextStatus && (
                                      <div
                                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 w-0.5 h-7 z-base ${nextStatus.lineClass}`}
                                      ></div>
                                    )}
                                  </div>
                                  {/* 공정명 */}
                                  <div className="flex-1 -mt-1">
                                    <span
                                      className={`text-xs ${
                                        isCurrent
                                          ? 'text-gray-900 font-bold'
                                          : isDone
                                            ? 'text-gray-500 font-medium'
                                            : 'text-gray-300'
                                      }`}
                                    >
                                      {operation}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 진행률 바 */}
                          <div className="flex-1 ml-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] text-gray-400">진행률</span>
                              <span className="text-sm font-bold text-gray-700">
                                {order.progressRate}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${order.progressRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500 col-span-full">
                <i className="ri-file-list-3-line text-3xl"></i>
                <p className="mt-3 text-lg font-medium">
                  선택한 조건에 해당하는 작업지시가 없습니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {isError || isLoading ? null : (
        <Pagination
          currentPage={currentPage}
          totalPages={pageInfo?.totalPages ?? 1}
          totalElements={pageInfo?.totalElements}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
}
