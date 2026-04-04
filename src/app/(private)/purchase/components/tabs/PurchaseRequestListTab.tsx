'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PurchaseRequestModal from '@/app/(private)/purchase/components/modals/PurchaseRequestModal';
import PurchaseRequestDetailModal from '@/app/(private)/purchase/components/modals/PurchaseRequestDetailModal';
import {
  fetchPurchaseReqList,
  fetchPurchaseRequisitionSearchTypeDropdown,
  fetchPurchaseRequisitionStatusDropdown,
  postApporvePurchaseReq,
  postRejectPurchaseReq,
} from '@/app/(private)/purchase/api/purchase.api';
import IconButton from '@/app/components/common/IconButton';
import Dropdown from '@/app/components/common/Dropdown';
import {
  PurchaseReqListResponse,
  PurchaseReqResponse,
} from '@/app/(private)/purchase/types/PurchaseReqType';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import { getQueryClient } from '@/lib/queryClient';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import Table, { TableColumn } from '@/app/components/common/Table';
import Pagination from '@/app/components/common/Pagination';
import { PurchaseReqParams } from '@/app/(private)/purchase/types/PurchaseApiRequestType';
import { useModal } from '@/app/components/common/modal/useModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import { formatDateTime } from '@/app/utils/date';
import SearchBar from '@/app/components/common/SearchBar';
import { useDebounce } from 'use-debounce';
import StatusLabel from '@/app/components/common/StatusLabel';
// import CalendarButton from '@/app/components/common/Calendar';

export default function PurchaseRequestListTab() {
  const { openModal } = useModal();

  // 구매 요청 상태 드롭다운
  const { options: purchaseRequisitionStatusOptions } = useDropdown(
    'purchaseRequisitionStatusDropdown',
    fetchPurchaseRequisitionStatusDropdown,
  );

  // 구매 요청 검색 타입 드롭다운
  const { options: purchaseRequisitionSearchTypeOptions } = useDropdown(
    'purchaseRequisitionSearchTypeDropdown',
    fetchPurchaseRequisitionSearchTypeDropdown,
  );

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSearchType, setSelectedSearchType] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword] = useDebounce(keyword, 200);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const queryClient = useQueryClient();

  const queryParams = useMemo(
    (): PurchaseReqParams => ({
      statusCode: selectedStatus,
      type: selectedSearchType,
      keyword: debouncedKeyword,
      startDate,
      endDate,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedStatus, selectedSearchType, debouncedKeyword, startDate, endDate, currentPage],
  );

  const {
    data: requestData,
    isLoading,
    isError,
  } = useQuery<PurchaseReqListResponse>({
    queryKey: ['purchaseRequests', queryParams],
    queryFn: ({ queryKey }) => fetchPurchaseReqList(queryKey[1] as PurchaseReqParams),
    staleTime: 1000,
  });

  // 승인 mutation
  const { mutate: approvePurchaseRequest } = useMutation({
    mutationFn: (prId: string) => postApporvePurchaseReq(prId),
    onSuccess: () => {
      alert('구매 요청 승인 완료되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
    },
    onError: (error) => {
      alert(`구매 요청 승인 중 오류가 발생했습니다. ${error}`);
    },
  });

  // 반려 mutation
  const { mutate: rejectpurchaseRequest } = useMutation({
    mutationFn: (prId: string) => postRejectPurchaseReq(prId, ''),
    onSuccess: () => {
      alert('반려 처리되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
    },
    onError: (error) => {
      alert(`반려 처리 중 오류가 발생했습니다. ${error}`);
    },
  });

  const requests = requestData?.content || [];
  const pageInfo = requestData?.page;

  const totalPages = pageInfo?.totalPages ?? 1;

  type RequestItem = (typeof requests)[0];

  const handleViewDetail = (request: PurchaseReqResponse): void => {
    openModal(PurchaseRequestDetailModal, {
      title: '구매 요청 상세 정보',
      purchaseId: request.purchaseRequisitionId,
    });
  };

  const handleViewRequestModal = () => {
    openModal(PurchaseRequestModal, {
      title: '구매 요청 작성',
      height: '800px',
    });
  };

  const handleApprove = (prId: string) => {
    if (confirm('해당 요청을 승인하시겠습니까?')) {
      approvePurchaseRequest(prId);
    }
  };

  const handleReject = (prId: string) => {
    if (confirm('해당 요청을 반려하시겠습니까?')) {
      rejectpurchaseRequest(prId);
    }
  };

  const columns: TableColumn<RequestItem>[] = [
    {
      key: 'purchaseRequisitionNumber',
      label: '구매요청번호',
      align: 'center',
      render: (_, r) => (
        <div className="flex flex-col">
          <span>{r.purchaseRequisitionNumber}</span>
        </div>
      ),
    },
    { key: 'requesterName', label: '요청자', align: 'center' },
    { key: 'departmentName', label: '부서', align: 'center' },
    {
      key: 'requestDate',
      label: '요청일',
      align: 'center',
      render: (_, r) => formatDateTime(r.requestDate),
    },
    {
      key: 'totalAmount',
      label: '총금액',
      align: 'center',
      render: (_, r) => `${r.totalAmount}원`,
    },
    {
      key: 'statusCode',
      label: '상태',
      align: 'center',
      render: (_, r) => <StatusLabel $statusCode={r.statusCode} />,
    },
    {
      key: 'action',
      label: '작업',
      align: 'center',
      render: (_, r) => (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handleViewDetail(r)}
            className="w-8 h-8 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded cursor-pointer"
            title="상세보기"
          >
            <i className="ri-eye-line"></i>
          </button>
          {r.statusCode === 'PENDING' && (
            <>
              <button
                onClick={() => handleApprove(r.purchaseRequisitionId)}
                className="text-green-600 hover:text-green-900 cursor-pointer"
                title="승인"
              >
                <i className="ri-check-line"></i>
              </button>
              <button
                onClick={() => handleReject(r.purchaseRequisitionId)}
                className="text-red-600 hover:text-red-900 cursor-pointer"
                title="반려"
              >
                <i className="ri-close-line"></i>
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 필터 헤더 */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
        {/* <CalendarButton /> */}
        <DateRangePicker
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
        />
        <div className="flex items-center space-x-4">
          <Dropdown
            placeholder="전체 상태"
            items={purchaseRequisitionStatusOptions}
            value={selectedStatus}
            onChange={(status: string): void => {
              setSelectedStatus(status);
              setCurrentPage(1);
            }}
          />

          <SearchBar
            options={purchaseRequisitionSearchTypeOptions}
            onTypeChange={(type) => {
              setSelectedSearchType(type);
            }}
            onKeywordSearch={(keyword) => {
              setKeyword(keyword);
              setCurrentPage(1); // 검색 시 페이지 초기화
            }}
            placeholder="검색어를 입력하세요"
          />

          {/* 구매 요청 작성 버튼 */}
          <IconButton label="구매 요청 작성" icon="ri-add-line" onClick={handleViewRequestModal} />
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox $type="loading" $message="구매 요청 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox
          $type="error"
          $message="구매 요청 목록을 불러오는 중 오류가 발생했습니다."
        />
      ) : (
        <Table
          columns={columns}
          data={requests}
          keyExtractor={(row) => row.purchaseRequisitionId}
          emptyMessage="구매 요청 정보가 없습니다."
          className="flex-1 min-h-0"
        />
      )}
      {isError || isLoading ? null : (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={pageInfo?.totalElements}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
}
