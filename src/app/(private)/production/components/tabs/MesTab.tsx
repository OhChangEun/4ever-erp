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
import Table, { TableColumn } from '@/app/components/common/Table';
import TableStatusBox from '@/app/components/common/TableStatusBox';

export default function MesTab() {
  const [selectedMesQuote, setSelectedMesQuote] = useState('');
  const [selectedMesStatus, setSelectedMesStatus] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { openModal } = useModal();
  const { options: mrpQuotationOptions } = useDropdown(
    'mrpQuotationsDropdown',
    fetchMrpQuotationsDropdown,
  );

  const { options: mesStatusOptions } = useDropdown('mesStatusDropdown', fetchMesStatusDropdown);

  const queryParams = useMemo(
    () => ({
      quotationId: selectedMesQuote,
      status: selectedMesStatus,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedMesQuote, selectedMesStatus, currentPage],
  );

  const {
    data: mesResponse,
    isLoading,
    isError,
  } = useQuery<MesListResponse>({
    queryKey: ['mesList', queryParams],
    queryFn: ({ queryKey }) => fetchMesList(queryKey[1] as FetchMesListParams),
    staleTime: 1000,
  });

  const mesListData: MesSummaryItem[] = useMemo(() => mesResponse?.content || [], [mesResponse]);
  const pageInfo = mesResponse?.page;

  const handleShowProcessDetail = (mesId: string) => {
    openModal(ProcessDetailModal, { title: 'MES 현황', mesId: mesId, height: '800px' });
  };

  const getStepState = (
    operationIndex: number,
    currentOperationNumber: number,
    status: string,
  ): 'done' | 'active' | 'pending' => {
    if (status === 'PLANNED' || status === 'PENDING') return 'pending';
    const operationNum = operationIndex + 1;
    if (operationNum < currentOperationNumber) return 'done';
    if (operationNum === currentOperationNumber) return 'active';
    return 'pending';
  };

  const stepperRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    stepperRefs.current.forEach((el) => {
      const activeStep = el.querySelector('[data-active="true"]') as HTMLElement | null;
      if (activeStep) {
        const containerWidth = el.clientWidth;
        const stepLeft = activeStep.offsetLeft;
        const stepWidth = activeStep.clientWidth;
        el.scrollTo({
          left: stepLeft - containerWidth / 2 + stepWidth / 2,
          behavior: 'smooth',
        });
      }
    });
  }, [mesListData]);

  const columns: TableColumn<MesSummaryItem>[] = [
    {
      key: 'status',
      label: '상태',
      align: 'center',
      render: (_, row) => {
        const statusConfig: Record<string, { label: string; dot: string; class: string }> = {
          WAITING: { label: '대기중', dot: 'bg-gray-400', class: 'text-gray-500' },
          IN_PROGRESS: { label: '진행중', dot: 'bg-blue-500', class: 'text-blue-600' },
          COMPLETED: { label: '완료', dot: 'bg-green-500', class: 'text-green-600' },
        };
        const config = statusConfig[row.status] ?? {
          label: row.status,
          dot: 'bg-gray-400',
          class: 'text-gray-400',
        };
        return (
          <span className={`flex items-center justify-center gap-1.5 ${config.class}`}>
            <span className={`w-1 h-1 rounded-full shrink-0 ${config.dot}`} />
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'quotationNumber',
      label: '견적번호',
      align: 'center',
      render: (_, row) => <span className="font-medium text-gray-700">{row.quotationNumber}</span>,
    },
    {
      key: 'productName',
      label: '제품명',
      align: 'center',
    },
    {
      key: 'quantity',
      label: '수량',
      align: 'center',
      render: (_, row) => (
        <span className="text-gray-600">
          {row.quantity} <span className="text-gray-400">{row.uomName}</span>
        </span>
      ),
    },
    {
      key: 'startDate',
      label: '시작일',
      align: 'center',
      render: (_, row) => <span className="text-gray-400 whitespace-nowrap">{row.startDate}</span>,
    },
    {
      key: 'endDate',
      label: '종료일',
      align: 'center',
      render: (_, row) => <span className="text-gray-400 whitespace-nowrap">{row.endDate}</span>,
    },
    {
      key: 'sequence',
      label: '공정 진행',
      align: 'center',
      render: (_, row) => {
        const currentOpNum = row.currentOperation || 0;
        return (
          <div
            ref={(el) => {
              if (el) stepperRefs.current.set(row.mesId, el);
            }}
            className="flex items-center justify-center gap-0 overflow-x-auto pb-1 scrollbar-none"
          >
            {row.sequence.map((operation, index) => {
              const state = getStepState(index, currentOpNum, row.status);
              const isLast = index === row.sequence.length - 1;
              return (
                <div
                  key={index}
                  className="flex items-center shrink-0"
                  data-active={state === 'active'}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div
                      className={`flex items-center justify-center rounded-full shrink-0 transition-all ${
                        state === 'done'
                          ? 'w-4 h-4 bg-blue-500'
                          : state === 'active'
                            ? 'w-5 h-5 bg-blue-600 ring-2 ring-blue-200'
                            : 'w-4 h-4 bg-gray-200'
                      }`}
                    >
                      {state === 'done' ? (
                        <i className="ri-check-line text-white text-[8px]" />
                      ) : state === 'active' ? (
                        <i className="ri-play-mini-fill text-white text-[9px]" />
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                      )}
                    </div>
                    <span
                      className={`text-[9px] leading-tight text-center max-w-10 truncate ${
                        state === 'active'
                          ? 'text-blue-700 font-bold'
                          : state === 'done'
                            ? 'text-gray-600'
                            : 'text-gray-400'
                      }`}
                    >
                      {operation}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`w-4 h-0.5 mx-0.5 -mt-3 ${
                        getStepState(index + 1, currentOpNum, row.status) !== 'pending'
                          ? 'bg-blue-400'
                          : state === 'active'
                            ? 'bg-linear-to-r from-blue-400 to-gray-200'
                            : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'progressRate',
      label: '진행률',
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-2">
          <div className="w-40 bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${row.progressRate}%` }}
            />
          </div>
          <span className="font-semibold text-gray-600 w-8">{row.progressRate}%</span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-end gap-3 shrink-0">
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

      <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl overflow-hidden">
        {isLoading ? (
          <TableStatusBox $type="loading" $message="MES 데이터를 불러오는 중입니다..." />
        ) : isError ? (
          <TableStatusBox $type="error" $message="데이터를 불러오는데 실패했습니다." />
        ) : (
          <Table
            columns={columns}
            data={mesListData}
            keyExtractor={(row) => row.mesId}
            onRowClick={(row) => handleShowProcessDetail(row.mesId)}
            emptyMessage="선택한 조건에 해당하는 작업지시가 없습니다."
          />
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
