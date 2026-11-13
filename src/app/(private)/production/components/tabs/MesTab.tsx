'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  type FetchMesListParams,
  type MesListResponse,
  type MesSummaryItem,
} from '@/app/(private)/production/types/MesListApiType';
import { Dropdown } from '@everp/ui';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchMesList,
  fetchMesStatusDropdown,
  fetchMrpQuotationsDropdown,
} from '../../api/production.api';
import { useModal } from '@/app/components/common/modal/useModal';
import ProcessDetailModal from '../modals/ProcessDetailModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import { Pagination, TabButtons } from '@everp/ui';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useOptionLabels } from '@/app/hooks/useOptionLabels';

// 간트는 전환할 때만 받는다(시각화 3, 첫 로드 예산)
const MesGantt = dynamic(() => import('../MesGantt'), {
  ssr: false,
  loading: () => <div className="h-64" aria-hidden="true" />,
});

// name 은 메시지 키(production.mes.views.<키>)
const VIEWS: { id: string; name: 'table' | 'gantt' }[] = [
  { id: 'table', name: 'table' },
  { id: 'gantt', name: 'gantt' },
];

// 표에 그리는 MES 상태 점 색. 글자는 메시지(production.mes.status.<코드>)
const MES_STATUS_STYLE: Partial<
  Record<string, { key: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED'; dot: string; class: string }>
> = {
  WAITING: { key: 'WAITING', dot: 'bg-gray-400', class: 'text-gray-500' },
  IN_PROGRESS: { key: 'IN_PROGRESS', dot: 'bg-blue-500', class: 'text-blue-600' },
  COMPLETED: { key: 'COMPLETED', dot: 'bg-green-500', class: 'text-green-600' },
};
import { Table, type TableColumn } from '@everp/ui';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { mesKeys } from '@/app/(private)/production/api/production.keys';

export default function MesTab() {
  const t = useTranslations('production');
  const tNav = useTranslations('nav');
  const optionLabels = useOptionLabels();
  const [selectedMesQuote, setSelectedMesQuote] = useState('');
  const [selectedMesStatus, setSelectedMesStatus] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [view, setView] = useState('table');
  const pageSize = 10;

  const { openModal } = useModal();
  const { options: mrpQuotationOptions } = useDropdown(
    'mrpQuotationsDropdown',
    fetchMrpQuotationsDropdown,
  );

  const { options: mesStatusOptions } = useDropdown('mesStatusDropdown', fetchMesStatusDropdown);

  const queryParams = useMemo(
    (): FetchMesListParams => ({
      quotationId: selectedMesQuote,
      status: selectedMesStatus,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedMesQuote, selectedMesStatus, currentPage],
  );

  const {
    data: mesResponse,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery<MesListResponse>({
    queryKey: mesKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchMesList(queryParams),
  });

  const mesListData: MesSummaryItem[] = useMemo(() => mesResponse?.content || [], [mesResponse]);
  const pageInfo = mesResponse?.page;

  const handleShowProcessDetail = (mesId: string) => {
    openModal(ProcessDetailModal, { title: t('mes.detailTitle'), mesId: mesId, height: '800px' });
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
      const activeStep = el.querySelector<HTMLElement>('[data-active="true"]');
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
      label: t('common.status'),
      render: (_, row) => {
        const style = MES_STATUS_STYLE[row.status];
        // 모르는 상태는 코드 그대로(예전과 같음)
        const config = style
          ? { label: t(`mes.status.${style.key}`), dot: style.dot, class: style.class }
          : { label: row.status, dot: 'bg-gray-400', class: 'text-gray-400' };
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
      label: t('common.quotationNumber'),
      render: (_, row) => <span className="font-medium text-gray-700">{row.quotationNumber}</span>,
    },
    {
      key: 'productName',
      label: t('common.productName'),
    },
    {
      key: 'quantity',
      label: t('common.quantity'),
      render: (_, row) => (
        <span className="text-gray-600">
          {row.quantity} <span className="text-gray-400">{row.uomName}</span>
        </span>
      ),
    },
    {
      key: 'startDate',
      label: t('mes.startDate'),
      render: (_, row) => <span className="text-gray-400 whitespace-nowrap">{row.startDate}</span>,
    },
    {
      key: 'endDate',
      label: t('mes.endDate'),
      render: (_, row) => <span className="text-gray-400 whitespace-nowrap">{row.endDate}</span>,
    },
    {
      key: 'sequence',
      label: t('mes.sequence'),
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
      label: t('common.progress'),
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
        {/* 보기 전환(DESIGN_GUIDELINES: 툴바 왼쪽 세그먼트, 아이콘 없음) */}
        <div className="mr-auto">
          <TabButtons
            label={tNav('tabsLabel', { title: t('tabs.mes') })}
            tabs={VIEWS.map(({ id, name }) => ({ id, name: t(`mes.views.${name}`) }))}
            activeTab={view}
            onTabChange={setView}
          />
        </div>
        <Dropdown
          placeholder={t('common.selectQuote')}
          items={optionLabels(mrpQuotationOptions, { ALL: t('common.allQuotes') })}
          value={selectedMesQuote}
          onChange={(quote: string) => {
            setSelectedMesQuote(quote);
            setCurrentPage(1);
          }}
          autoSelectFirst
        />
        <Dropdown
          placeholder={t('common.allStatuses')}
          items={optionLabels(mesStatusOptions, {
            ALL: t('common.allStatuses'),
            WAITING: t('mes.status.WAITING'),
          })}
          value={selectedMesStatus}
          onChange={(status: string) => {
            setSelectedMesStatus(status);
          }}
        />
      </div>

      <div className="flex flex-col flex-1 min-h-0 bg-white rounded-lg overflow-hidden">
        {isLoading ? (
          <TableStatusBox type="loading" message={t('mes.loading')} />
        ) : isError ? (
          <TableStatusBox type="error" message={t('common.loadFailed')} />
        ) : view === 'gantt' ? (
          // 결과가 없으면 빈 눈금 대신 표 보기와 같은 안내(리뷰 P2)
          mesListData.length === 0 ? (
            <TableStatusBox type="empty" message={t('mes.empty')} />
          ) : (
            <MesGantt rows={mesListData} onSelect={handleShowProcessDetail} />
          )
        ) : (
          <Table
            isStale={isPlaceholderData}
            columns={columns}
            data={mesListData}
            keyExtractor={(row) => row.mesId}
            onRowClick={(row) => handleShowProcessDetail(row.mesId)}
            emptyMessage={t('mes.empty')}
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
