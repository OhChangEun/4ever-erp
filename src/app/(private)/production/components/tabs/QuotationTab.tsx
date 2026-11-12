'use client';
import { Dropdown } from '@everp/ui';
import { useState, useMemo } from 'react'; // useMemo 추가
import {
  type QuotationData,
  type FetchQuotationParams,
  type QuotationListResponse,
} from '@/app/(private)/production/types/QuotationApiType';
import SimulationResultModal from '@/app/(private)/production/components/modals/SimulationResultModal';
import {
  fetchQuotationList,
  fetchAvailableStatusDropdown,
} from '@/app/(private)/production/api/production.api';
import {
  useConfirmQuotations,
  useSimulateQuotations,
} from '@/app/(private)/production/api/production.mutations';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Pagination } from '@everp/ui';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import { useModal } from '@/app/components/common/modal/useModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Table, type TableColumn } from '@everp/ui';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { useToast } from '@/app/components/common/toast/useToast';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { quotationKeys } from '@/app/(private)/production/api/production.keys';
import { useTranslations } from 'next-intl';
import { useRole } from '@/app/hooks/useRole';
import { hasRole, PP_PLANNING_ROLES } from '@/lib/authz/policy';

import { Button } from '@everp/ui';
export default function QuotationTab() {
  const t = useTranslations('production');
  const { openModal, removeAllModals } = useModal();
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  // 시뮬레이션과 납기 확정은 게이트웨이가 PP 와 ALL_ADMIN 만 받는다. 확정은 시뮬레이션 결과 모달에서만 열린다
  const canSimulate = hasRole(PP_PLANNING_ROLES, useRole());

  // 가용 재고 상태 드롭다운
  const { options: availableStatusOptions } = useDropdown(
    'availableStatusDropdown',
    fetchAvailableStatusDropdown,
  );

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('ALL'); // 코드 목록은 서버 드롭다운이 정한다

  // 선택된 견적
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // 1. 견적 리스트를 가져오는 useQuery
  const quotationListQueryParams = useMemo(
    (): FetchQuotationParams => ({
      availableStatusCode: selectedStockStatus,
      page: currentPage - 1,
      size: pageSize,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [selectedStockStatus, currentPage, pageSize, startDate, endDate],
  );

  const {
    data: quotationListData,
    isPlaceholderData: isPlaceholderData,
    isLoading: isQuotationListLoading,
    isError: isQuotationListError,
  } = useQuery<QuotationListResponse>({
    queryKey: quotationKeys.list(quotationListQueryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchQuotationList(quotationListQueryParams),
  });

  // API에서 가져온 견적 데이터 리스트
  // 다시 받기가 실패하면 캐시에 처리 전 목록이 남는다. 그 값으로 고르면 같은 쓰기가 또 가니 행이 없는 것으로 본다(표는 오류 상자)
  const quotationDataList: QuotationData[] = isQuotationListError
    ? []
    : quotationListData?.content || [];
  const totalPages = quotationListData?.page.totalPages || 1;
  const totalElements = quotationListData?.page.totalElements || 0;

  // 시뮬레이션과 확정은 미확인(UNCHECKED) 견적만. 모르는 상태는 고를 수 없다.
  // 선택은 그릴 때 지금 목록의 미확인 견적으로 거른다(확정 뒤 다시 받으면 빠진다)
  const uncheckedIds = quotationDataList
    .filter((q) => q.availableStatus === 'UNCHECKED')
    .map((q) => q.quotationId);
  const selectedIds = selectedQuotes.filter((quotationId) => uncheckedIds.includes(quotationId));

  // 시뮬레이션은 서버 상태를 바꾸는 쓰기라 mutation. 무효화는 production.mutations.ts 한 곳.
  const { mutate: simulationQuotations, isPending: simulationPending } = useSimulateQuotations({
    // 확정은 시뮬레이션한 견적(보낸 id)을 보낸다. 시뮬레이션 중에 선택을 바꿔도 결과 모달과 확정이 같은 묶음이다
    onSuccess: (simulationResults, simulatedIds) => {
      if (simulationResults.length > 0) {
        openModal(SimulationResultModal, {
          title: t('quotation.simulationTitle'),
          simulationResults,
          onConfirm: () => confirmQuotations(simulatedIds),
        });
      } else {
        toast.info(t('simulation.empty'));
      }
    },
    onError: (error) =>
      toast.error(t('quotation.simulationError', { message: errorMessageOf(error) })),
  });

  const { mutate: confirmQuotations } = useConfirmQuotations({
    onSuccess: () => {
      toast.success(t('quotation.confirmSuccess'));
      removeAllModals();
    },
    // 실패를 success 토스트로 알리던 버그 수정
    onError: (error) =>
      toast.error(t('quotation.confirmError', { message: errorMessageOf(error) })),
  });

  const handleQuoteSelect = (quotationId: string) => {
    setSelectedQuotes((prev) =>
      prev.includes(quotationId) ? prev.filter((id) => id !== quotationId) : [...prev, quotationId],
    );
  };

  // --- 이벤트 핸들러 ---
  const handleSimulation = () => {
    if (selectedIds.length === 0) {
      toast.warning(t('quotation.selectToSimulate'));
      return;
    }
    simulationQuotations(selectedIds);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setCurrentPage(1);
  };
  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setCurrentPage(1);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // useQuery가 currentPage 변경을 감지하고 자동으로 데이터를 다시 불러옴
  };

  // --- 컬럼 정의 ---
  const columns: TableColumn<QuotationData>[] = [
    {
      key: 'quotationId',
      label: '',
      width: '48px',
      headerRender: () => (
        <input
          type="checkbox"
          aria-label={t('quotation.selectAllUnchecked')}
          className="rounded border-gray-300 text-blue-600 accent-blue-600 focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setSelectedQuotes(e.target.checked ? uncheckedIds : [])}
          checked={uncheckedIds.length > 0 && selectedIds.length === uncheckedIds.length}
        />
      ),
      render: (_, quote) =>
        quote.availableStatus !== 'UNCHECKED' ? (
          <input
            type="checkbox"
            aria-label={t('quotation.checkedRow', { number: quote.quotationNumber })}
            className="rounded border-gray-300 text-gray-300"
            disabled
          />
        ) : (
          <input
            type="checkbox"
            aria-label={t('common.selectRow', { name: quote.quotationNumber })}
            className="rounded border-gray-300 text-blue-600 accent-blue-600 focus:ring-blue-500"
            checked={selectedQuotes.includes(quote.quotationId)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => handleQuoteSelect(quote.quotationId)}
          />
        ),
    },
    { key: 'quotationNumber', label: t('quotation.quotationNumber') },
    { key: 'customerName', label: t('common.customer') },
    { key: 'productName', label: t('common.productName') },
    { key: 'requestDate', label: t('common.requestDueDate') },
    {
      key: 'dueDate',
      label: t('common.suggestedDueDate'),
      render: (_, quote) => <>{quote.dueDate || '-'}</>,
    },
    {
      key: 'availableStatus',
      label: t('quotation.availability'),
      render: (_, quote) => <StatusLabel statusCode={quote.availableStatus} />,
    },
  ];

  // --- 렌더링 ---
  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between shrink-0">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
        />
        <div className="flex items-center gap-3">
          <Dropdown
            placeholder={t('quotation.allAvailability')}
            items={availableStatusOptions}
            value={selectedStockStatus}
            onChange={(status) => {
              setSelectedStockStatus(status);
              setCurrentPage(1); // 필터 변경 시 첫 페이지로
            }}
          />
          {canSimulate && (
            <Button
              label={t('quotation.simulate')}
              loading={simulationPending}
              onClick={handleSimulation}
              disabled={selectedIds.length === 0 || simulationPending}
            />
          )}
        </div>
      </div>
      {isQuotationListLoading ? (
        <TableStatusBox type="loading" message={t('quotation.loading')} />
      ) : isQuotationListError ? (
        <TableStatusBox type="error" message={t('quotation.loadError')} />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={quotationDataList}
          keyExtractor={(row) => row.quotationId}
          emptyMessage={t('quotation.empty')}
          className="flex-1 min-h-0"
          onRowClick={(row) => {
            if (row.availableStatus !== 'CHECKED') handleQuoteSelect(row.quotationId);
          }}
        />
      )}
      {!isQuotationListLoading && !isQuotationListError && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
