'use client';
import Dropdown from '@/app/components/common/Dropdown';
import { useState, useMemo } from 'react'; // useMemo 추가
import { AvailableStockStatus } from '@/app/(private)/production/constants';
import IconButton from '@/app/components/common/IconButton';
import {
  QuotationData,
  FetchQuotationParams,
  QuotationListResponse,
} from '@/app/(private)/production/types/QuotationApiType';
import SimulationResultModal from '@/app/(private)/production/components/modals/SimulationResultModal';
import {
  fetchQuotationSimulationResult,
  fetchQuotationList,
  fetchQuotationConfirm,
  fetchAvailableStatusDropdown,
} from '@/app/(private)/production/api/production.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Pagination from '@/app/components/common/Pagination';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import { useModal } from '@/app/components/common/modal/useModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import StatusLabel from '@/app/components/common/StatusLabel';
import Table, { TableColumn } from '@/app/components/common/Table';
import TableStatusBox from '@/app/components/common/TableStatusBox';

export default function QuotationTab() {
  const { openModal, removeAllModals } = useModal();

  // 가용 재고 상태 드롭다운
  const { options: availableStatusOptions } = useDropdown(
    'availableStatusDropdown',
    fetchAvailableStatusDropdown,
  );

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState<AvailableStockStatus>('ALL');

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
    isLoading: isQuotationListLoading,
    isError: isQuotationListError,
  } = useQuery<QuotationListResponse>({
    queryKey: ['quotationList', quotationListQueryParams], // 쿼리 키에 파라미터를 넣어 파라미터 변경 시 재요청
    queryFn: () => fetchQuotationList(quotationListQueryParams),
    staleTime: 1000,
  });

  // API에서 가져온 견적 데이터 리스트
  const quotationDataList: QuotationData[] = quotationListData?.content || [];
  const totalPages = quotationListData?.page?.totalPages || 1;
  const totalElements = quotationListData?.page?.totalElements || 0;

  const queryClient = useQueryClient();
  const { mutate: simulationQuotations, isPending: simulationPending } = useMutation({
    mutationFn: async (quotationIds: string[]) => {
      // 선택된 각 견적마다 개별 API 호출
      const results = await Promise.all(
        quotationIds.map((quotationId) =>
          fetchQuotationSimulationResult({
            quotationIds: [quotationId],
            page: 0,
            size: 1,
          }),
        ),
      );
      // 모든 결과의 content를 합치기
      return {
        page: results[0]?.page,
        content: results.flatMap((r) => r.content || []),
      };
    },
    onSuccess: (data) => {
      console.log(data);
      // 시뮬레이션 결과 모달
      if (data?.content && data.content.length > 0) {
        openModal(SimulationResultModal, {
          title: '시뮬레이션 결과',
          simulationResults: data.content,
          onConfirm: handleConfirmMps,
        });
      } else {
        alert('시뮬레이션 결과가 없습니다.');
      }

      queryClient.invalidateQueries({ queryKey: ['quotationList'] });
    },
    onError: (error) => {
      console.error('시뮬레이션 실패:', error);
      alert('시뮬레이션 결과를 가져오는데 실패했습니다.');
    },
  });

  const { mutate: confirmQuotations } = useMutation({
    mutationFn: (params: string[]) => fetchQuotationConfirm(params),
    onSuccess: () => {
      alert('제안납기를 확정하였습니다.');
      removeAllModals(); // 모든 탭 닫기

      queryClient.invalidateQueries({ queryKey: ['quotationList'] });
    },
    onError: (error) => {
      console.error('제안납기 확정 실패:', error);
      alert('제안납기를 확정하는데 실패했습니다.');
    },
  });

  const handleQuoteSelect = (quotationId: string) => {
    setSelectedQuotes((prev) =>
      prev.includes(quotationId) ? prev.filter((id) => id !== quotationId) : [...prev, quotationId],
    );
  };

  // --- 이벤트 핸들러 ---
  const handleSimulation = () => {
    if (selectedQuotes.length === 0) {
      alert('시뮬레이션을 실행할 견적을 선택해주세요');
      return;
    }
    // API 데이터에서 선택된 견적 중 'NOT_CHECKED'인지 확인
    const unCheckedQuotes = selectedQuotes.filter((quotationId) => {
      const quote = quotationDataList.find((q) => q.quotationId === quotationId);
      return quote && quote.availableStatus === 'UNCHECKED';
    });

    if (unCheckedQuotes.length === 0) {
      alert("가용 재고가 '미확인'인 견적을 선택해주세요.");
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
      align: 'center',
      headerRender: () => (
        <input
          type="checkbox"
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
          <input type="checkbox" className="rounded border-gray-300 text-gray-300" disabled />
        ) : (
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 accent-blue-600 focus:ring-blue-500"
            checked={selectedQuotes.includes(quote.quotationId)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => handleQuoteSelect(quote.quotationId)}
          />
        ),
    },
    { key: 'quotationNumber', label: '견적 번호', align: 'center' },
    { key: 'customerName', label: '고객사', align: 'center' },
    { key: 'productName', label: '제품명', align: 'center' },
    { key: 'requestDate', label: '요청 납기', align: 'center' },
    {
      key: 'dueDate',
      label: '제안 납기',
      align: 'center',
      render: (_, quote) => <>{quote.dueDate || '-'}</>,
    },
    {
      key: 'availableStatus',
      label: '가용 재고',
      align: 'center',
      render: (_, quote) => <StatusLabel $statusCode={quote.availableStatus} />,
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
            onChange={(status: AvailableStockStatus) => {
              setSelectedStockStatus(status);
              setCurrentPage(1); // 필터 변경 시 첫 페이지로
            }}
          />
          <IconButton
            label={simulationPending ? '시뮬레이션 중...' : '시뮬레이션'}
            icon={simulationPending ? 'ri-loader-4-line animate-spin' : 'ri-play-line'}
            onClick={handleSimulation}
            disabled={selectedQuotes.length === 0 || simulationPending}
          />
        </div>
      </div>
      {isQuotationListLoading ? (
        <TableStatusBox $type="loading" $message="견적 목록을 불러오는 중입니다..." />
      ) : isQuotationListError ? (
        <TableStatusBox $type="error" $message="견적 목록을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <Table
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
