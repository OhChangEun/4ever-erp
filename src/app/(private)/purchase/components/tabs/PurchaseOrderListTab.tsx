'use client';

import { useMemo, useState } from 'react';
import PurchaseOrderDetailModal from '@/app/(private)/purchase/components/modals/PurchaseOrderDetailModal';
import PurchaseOrderTable from '@/app/(private)/purchase/components/sections/PurchaseOrderTable';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchPurchaseOrderList,
  fetchPurchaseOrderSearchTypeOptions,
  fetchPurchaseOrderStatusOptions,
} from '@/app/(private)/purchase/api/purchase.api';
import {
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
  useStartPurchaseOrderDelivery,
} from '@/app/(private)/purchase/api/purchase.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { Dropdown } from '@everp/ui';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import { Pagination } from '@everp/ui';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useModal } from '@/app/components/common/modal/useModal';
import { SearchBar } from '@everp/ui';
import { useDebounce } from 'use-debounce';
import { type PurchaseOrderListParams } from '@/app/(private)/purchase/types/PurchaseOrderType';
import { useRole } from '@/app/hooks/useRole';
import { useToast } from '@/app/components/common/toast/useToast';
import { purchaseOrderKeys } from '@/app/(private)/purchase/api/purchase.keys';
import { useTranslations } from 'next-intl';

export default function PurchaseOrderListTab() {
  const { openModal } = useModal();
  const toast = useToast();
  const t = useTranslations('purchase.orderList');
  const tc = useTranslations('purchase.common');

  // 발주서 타입 드롭다운
  const { options: purchaseOrderStatusOptions } = useDropdown(
    'purchaseOrderStatusDropdown',
    fetchPurchaseOrderStatusOptions,
  );
  // 발주서 검색 타입 드롭다운
  const { options: purchaseOrderSearchTypeOptions } = useDropdown(
    'purchaseOrderSearchTypeDropdown',
    fetchPurchaseOrderSearchTypeOptions,
  );

  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSearchType, setSelectedSearchType] = useState('');
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword] = useDebounce(keyword, 200);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const role = useRole();
  const isSupplier = role === 'SUPPLIER_ADMIN';

  const queryParams = useMemo(
    (): PurchaseOrderListParams => ({
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
    isPlaceholderData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: purchaseOrderKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchPurchaseOrderList(queryParams),
  });

  // mutation 과 무효화 범위는 purchase.mutations.ts 한 곳. 여기선 결과를 알리기만 한다.
  const { mutate: approveOrder, isPending: isApproving } = useApprovePurchaseOrder({
    onSuccess: () => toast.success(t('approveSuccess')),
    onError: (error) => toast.error(t('approveError', { message: errorMessageOf(error) })),
  });
  const { mutate: rejectOrder, isPending: isRejecting } = useRejectPurchaseOrder({
    onSuccess: () => toast.success(t('rejectSuccess')),
    onError: (error) => toast.error(t('rejectError', { message: errorMessageOf(error) })),
  });
  const { mutate: startDelivery, isPending: isStartingDelivery } = useStartPurchaseOrderDelivery({
    onSuccess: () => toast.info(t('deliverySuccess')),
    onError: (error) => toast.error(t('deliveryError', { message: errorMessageOf(error) })),
  });

  const orders = orderData?.content || []; // optional chaining으로 안전하게 처리
  const pageInfo = orderData?.page;
  const totalPages = pageInfo?.totalPages ?? 1;

  const handleApprove = (purchaseOrderId: string) => {
    if (confirm(t('confirmApprove'))) {
      approveOrder(purchaseOrderId);
    }
  };

  const handleReject = (purchaseOrderId: string) => {
    if (confirm(t('confirmReject'))) {
      rejectOrder({ purchaseOrderId, reason: '' });
    }
  };

  const handleStartDelivery = (purchaseOrderId: string) => {
    if (confirm(t('confirmStartDelivery'))) {
      startDelivery(purchaseOrderId);
    }
  };

  // 상세 보기 모달 핸들러
  const handleViewDetail = (purchaseOrderId: string): void => {
    openModal(PurchaseOrderDetailModal, {
      title: t('detailModalTitle'),
      purchaseOrderId,
      width: '800px',
    });
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <DateRangePicker
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
        />

        <div className="flex items-center gap-2">
          <Dropdown
            placeholder={tc('allStatuses')}
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
            placeholder={tc('searchPlaceholder')}
            disabled={isSupplier}
          />
        </div>

        {/* 상태 필터 */}
      </div>

      {isLoading ? (
        <TableStatusBox type="loading" message={t('loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('loadError')} error={error} />
      ) : (
        <PurchaseOrderTable
          orders={orders}
          onViewDetail={handleViewDetail}
          onApprove={handleApprove}
          onReject={handleReject}
          onStartDelivery={handleStartDelivery}
          isStale={isPlaceholderData}
          actionsDisabled={isApproving || isRejecting || isStartingDelivery}
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
