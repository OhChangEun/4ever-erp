'use client';

import { useMemo, useState } from 'react';
import PurchaseOrderDetailModal from '@/app/(private)/purchase/components/modals/PurchaseOrderDetailModal';
import PurchaseOrderTable from '@/app/(private)/purchase/components/sections/PurchaseOrderTableSection';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  fetchPurchaseOrderList,
  fetchPurchaseOrderSearchTypeDropdown,
  fetchPurchaseOrderStatusDropdown,
  postApprovePurchaseOrder,
  postDeliveryStartOrder,
  postRejectPurchaseOrder,
} from '@/app/(private)/purchase/api/purchase.api';
import Dropdown from '@/app/components/common/Dropdown';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import { getQueryClient } from '@/lib/queryClient';
import Pagination from '@/app/components/common/Pagination';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useModal } from '@/app/components/common/modal/useModal';
import SearchBar from '@/app/components/common/SearchBar';
import { useDebounce } from 'use-debounce';
import { FetchPurchaseOrderParams } from '../../types/PurchaseApiRequestType';
import { useRole } from '@/app/hooks/useRole';
import { useToast } from '@/app/components/common/toast/useToast';

export default function PurchaseOrderListTab() {
  const { openModal } = useModal();
  const toast = useToast();

  // 발주서 타입 드롭다운
  const { options: purchaseOrderStatusOptions } = useDropdown(
    'purchaseOrderStatusDropdown',
    fetchPurchaseOrderStatusDropdown,
  );
  // 발주서 검색 타입 드롭다운
  const { options: purchaseOrderSearchTypeOptions } = useDropdown(
    'purchaseOrderSearchTypeDropdown',
    fetchPurchaseOrderSearchTypeDropdown,
  );

  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSearchType, setSelectedSearchType] = useState('');
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword] = useDebounce(keyword, 200);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryClient = getQueryClient();

  const role = useRole();
  const isSupplier = role === 'SUPPLIER_ADMIN';

  const queryParams = useMemo(
    (): FetchPurchaseOrderParams => ({
      statusCode: selectedStatus || undefined,
      type: selectedSearchType,
      keyword: debouncedKeyword,
      page: currentPage - 1,
      size: pageSize,
      startDate: startDate,
      endDate: endDate,
    }),
    [currentPage, selectedStatus, selectedSearchType, debouncedKeyword, startDate, endDate],
  );

  const {
    data: orderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['purchaseOrders', queryParams],
    queryFn: () => fetchPurchaseOrderList(queryParams),
    staleTime: 1000,
  });

  // 발주서 승인
  const { mutate: approvePurchaseOrder } = useMutation({
    mutationFn: (poId: string) => postApprovePurchaseOrder(poId),
    onSuccess: () => {
      toast.success('발주서 승인 완료되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
    onError: (error) => {
      toast.error(`발주서 승인 중 오류가 발생했습니다. ${error}`);
    },
  });

  // 발주서 반려
  const { mutate: rejectPurhcaseOrder } = useMutation({
    mutationFn: (poId: string) => postRejectPurchaseOrder(poId, ''),
    onSuccess: () => {
      toast.success('반려 처리되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders"'] });
    },
    onError: (error) => {
      toast.error(`반려 중 오류가 발생했습니다. ${error}`);
    },
  });

  const { mutate: deliveryPurhcaseOrder } = useMutation({
    mutationFn: (poId: string) => postDeliveryStartOrder(poId),
    onSuccess: () => {
      toast.info('배송이 시작되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders"'] });
    },
    onError: (error) => {
      toast.error(`배송 시작 처리 중 오류가 발생했습니다. ${error}`);
    },
  });

  const orders = orderData?.content || []; // optional chaining으로 안전하게 처리
  const pageInfo = orderData?.page;
  const totalPages = pageInfo?.totalPages ?? 1;

  const handleApprove = (poId: string) => {
    if (confirm('해당 요청을 승인하시겠습니까?')) {
      approvePurchaseOrder(poId);
    }
  };

  const handleReject = (poId: string) => {
    if (confirm('해당 요청을 반려하시겠습니까?')) {
      rejectPurhcaseOrder(poId);
    }
  };

  const handleDelivery = (poId: string) => {
    if (confirm('배송을 시작하시겠습니까?')) {
      deliveryPurhcaseOrder(poId);
    }
  };

  // 상세 보기 모달 핸들러
  const handleViewDetail = (purchaseId: string): void => {
    openModal(PurchaseOrderDetailModal, {
      title: '발주서 상세정보',
      purchaseId: purchaseId,
      width: '800px',
    });
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between shrink-0">
        <DateRangePicker
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
        />

        <div className="flex items-center gap-3">
          <Dropdown
            placeholder="전체 상태"
            items={purchaseOrderStatusOptions}
            value={selectedStatus}
            onChange={(status: string) => {
              setSelectedStatus(status);
              setCurrentPage(1);
            }}
          />
          <SearchBar
            options={purchaseOrderSearchTypeOptions}
            onTypeChange={(type) => {
              setSelectedSearchType(type);
            }}
            onKeywordSearch={(keyword) => {
              setKeyword(keyword);
              setCurrentPage(1);
            }}
            placeholder="검색어를 입력하세요"
            disabled={isSupplier}
          />
        </div>

        {/* 상태 필터 */}
      </div>

      {isLoading ? (
        <TableStatusBox $type="loading" $message="발주서 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox $type="error" $message="발주서 목록을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <PurchaseOrderTable
          currentOrders={orders}
          handleViewDetail={handleViewDetail}
          handleApprove={handleApprove}
          handleReject={handleReject}
          handleDelivery={handleDelivery}
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
