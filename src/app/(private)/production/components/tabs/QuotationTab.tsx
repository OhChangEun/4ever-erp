'use client';
import Dropdown from '@/app/components/common/Dropdown';
import { useState, useMemo } from 'react'; // useMemo 추가
import {
  QuotationData,
  FetchQuotationParams,
  QuotationListResponse,
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
import Pagination from '@/app/components/common/Pagination';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import { useModal } from '@/app/components/common/modal/useModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import StatusLabel from '@/app/components/common/StatusLabel';
import Table, { TableColumn } from '@/app/components/common/Table';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';
import { quotationKeys } from '@/app/(private)/production/api/production.keys';

import Button from '@/app/components/common/Button';
export default function QuotationTab() {
  const { openModal, removeAllModals } = useModal();
  const toast = useToast();

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
  const quotationDataList: QuotationData[] = quotationListData?.content || [];
  const totalPages = quotationListData?.page?.totalPages || 1;
  const totalElements = quotationListData?.page?.totalElements || 0;

  // 시뮬레이션은 서버 상태를 바꾸는 쓰기라 mutation. 무효화는 production.mutations.ts 한 곳.
  const { mutate: simulationQuotations, isPending: simulationPending } = useSimulateQuotations({
    onSuccess: (simulationResults) => {
      if (simulationResults.length > 0) {
        openModal(SimulationResultModal, {
          title: '시뮬레이션 결과',
          simulationResults,
          onConfirm: handleConfirmMps,
        });
      } else {
        toast.info('시뮬레이션 결과가 없습니다.');
      }
    },
    onError: (error) =>
      toast.error(`시뮬레이션 결과를 가져오는데 실패했습니다. ${errorMessageOf(error)}`),
  });

  const { mutate: confirmQuotations } = useConfirmQuotations({
    onSuccess: () => {
      toast.success('제안납기를 확정하였습니다.');
      removeAllModals();
    },
    // 실패를 success 토스트로 알리던 버그 수정
    onError: (error) => toast.error(`제안납기를 확정하는데 실패했습니다. ${errorMessageOf(error)}`),
  });

  const handleQuoteSelect = (quotationId: string) => {
    setSelectedQuotes((prev) =>
      prev.includes(quotationId) ? prev.filter((id) => id !== quotationId) : [...prev, quotationId],
    );
  };

  // --- 이벤트 핸들러 ---
  const handleSimulation = () => {
    if (selectedQuotes.length === 0) {
      toast.warning('시뮬레이션을 실행할 견적을 선택해주세요');
      return;
    }
    // API 데이터에서 선택된 견적 중 'NOT_CHECKED'인지 확인
    const unCheckedQuotes = selectedQuotes.filter((quotationId) => {
      const quote = quotationDataList.find((q) => q.quotationId === quotationId);
      return quote && quote.availableStatus === 'UNCHECKED';
    });

    if (unCheckedQuotes.length === 0) {
      toast.warning("가용 재고가 '미확인'인 견적을 선택해주세요.");
      return;
    }

    simulationQuotations(unCheckedQuotes);
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

  const handleConfirmMps = () => {
    confirmQuotations(selectedQuotes);
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
          aria-label="미확인 견적 전체 선택"
          className="rounded border-gray-300 text-blue-600 accent-blue-600 focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const uncheckedIds = quotationDataList
              .filter((q) => q.availableStatus === 'UNCHECKED')
              .map((q) => q.quotationId);
            if (e.target.checked) {
              setSelectedQuotes(uncheckedIds);
            } else {
              setSelectedQuotes([]);
            }
          }}
          checked={
            quotationDataList.some((q) => q.availableStatus === 'UNCHECKED') &&
            quotationDataList
              .filter((q) => q.availableStatus === 'UNCHECKED')
              .every((q) => selectedQuotes.includes(q.quotationId))
          }
        />
      ),
      render: (_, quote) =>
        quote.availableStatus === 'CHECKED' ? (
          <input
            type="checkbox"
            aria-label={`${quote.quotationNumber} 가용재고 확인 완료(선택할 수 없음)`}
            className="rounded border-gray-300 text-gray-300"
            disabled
          />
        ) : (
          <input
            type="checkbox"
            aria-label={`${quote.quotationNumber} 선택`}
            className="rounded border-gray-300 text-blue-600 accent-blue-600 focus:ring-blue-500"
            checked={selectedQuotes.includes(quote.quotationId)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => handleQuoteSelect(quote.quotationId)}
          />
        ),
    },
    { key: 'quotationNumber', label: '견적 번호' },
    { key: 'customerName', label: '고객사' },
    { key: 'productName', label: '제품명' },
    { key: 'requestDate', label: '요청 납기' },
    {
      key: 'dueDate',
      label: '제안 납기',
      render: (_, quote) => <>{quote.dueDate || '-'}</>,
    },
    {
      key: 'availableStatus',
      label: '가용 재고',
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
            placeholder="전체 가용재고"
            items={availableStatusOptions}
            value={selectedStockStatus}
            onChange={(status) => {
              setSelectedStockStatus(status);
              setCurrentPage(1); // 필터 변경 시 첫 페이지로
            }}
          />
          <Button
            label="시뮬레이션"
            loading={simulationPending}
            onClick={handleSimulation}
            disabled={selectedQuotes.length === 0 || simulationPending}
          />
        </div>
      </div>
      {isQuotationListLoading ? (
        <TableStatusBox type="loading" message="견적 목록을 불러오는 중입니다..." />
      ) : isQuotationListError ? (
        <TableStatusBox type="error" message="견적 목록을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={quotationDataList}
          keyExtractor={(row) => row.quotationId}
          emptyMessage="조회된 견적 데이터가 없습니다."
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
