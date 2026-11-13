'use client';

import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import PurchaseRequestFormModal from '@/app/(private)/purchase/components/modals/PurchaseRequestFormModal';
import PurchaseRequestDetailModal from '@/app/(private)/purchase/components/modals/PurchaseRequestDetailModal';
import {
  fetchPurchaseRequestList,
  fetchPurchaseRequestSearchTypeOptions,
  fetchPurchaseRequestStatusOptions,
} from '@/app/(private)/purchase/api/purchase.api';
import {
  useApprovePurchaseRequest,
  useRejectPurchaseRequest,
} from '@/app/(private)/purchase/api/purchase.mutations';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { Dropdown } from '@everp/ui';
import {
  type PurchaseRequestListItem,
  type PurchaseRequestListParams,
  type PurchaseRequestListResponse,
} from '@/app/(private)/purchase/types/PurchaseRequestType';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Table, type TableColumn } from '@everp/ui';
import { Pagination } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import ConfirmModal from '@/app/components/common/modal/ConfirmModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import { formatDateTime } from '@/app/utils/date';
import { SearchBar } from '@everp/ui';
import { useDebounce } from 'use-debounce';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useToast } from '@/app/components/common/toast/useToast';
import { purchaseRequestKeys } from '@/app/(private)/purchase/api/purchase.keys';
import { formatCurrency } from '@/app/utils/number';
import { Button } from '@everp/ui';
import { useTranslations } from 'next-intl';
import { useOptionLabels } from '@/app/hooks/useOptionLabels';
import { useRole } from '@/app/hooks/useRole';
import { hasRole, MM_GATEWAY_ROLES } from '@/lib/authz/policy';

export default function PurchaseRequestListTab() {
  const { openModal } = useModal();
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  const t = useTranslations('purchase.requestList');
  const tc = useTranslations('purchase.common');
  const optionLabels = useOptionLabels();
  // 승인과 반려는 게이트웨이가 MM 과 ALL_ADMIN 만 받는다
  const canDecide = hasRole(MM_GATEWAY_ROLES, useRole());

  // 구매 요청 상태 드롭다운
  const { options: purchaseRequestStatusOptions } = useDropdown(
    'purchaseRequestStatusDropdown',
    fetchPurchaseRequestStatusOptions,
    // 전체 항목(공통 common.all, 값 '')을 붙인다. 없으면 한 번 고른 필터를 되돌릴 수 없다(카드 "목 필터와 검색")
    'with-all',
  );

  // 구매 요청 검색 타입 드롭다운
  const { options: purchaseRequestSearchTypeOptions } = useDropdown(
    'purchaseRequestSearchTypeDropdown',
    fetchPurchaseRequestSearchTypeOptions,
  );

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSearchType, setSelectedSearchType] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword] = useDebounce(keyword, 200);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const queryParams = useMemo(
    (): PurchaseRequestListParams => ({
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
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
    error,
  } = useQuery<PurchaseRequestListResponse>({
    queryKey: purchaseRequestKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchPurchaseRequestList(queryParams),
  });

  // mutation 과 무효화 범위는 purchase.mutations.ts 한 곳.
  // 확인 모달이 요청이 끝난 것을 알아야 닫으므로 mutateAsync 를 넘긴다. 중복 제출은 모달의 확인 버튼 잠금과 훅의 안전망이 막는다.
  // 승인이나 반려가 가는 중에는 같은 행의 다른 버튼도 잠근다(요청 중 Esc 로 모달을 닫을 수 있다).
  const { mutateAsync: approveRequest, isPending: isApproving } = useApprovePurchaseRequest({
    onSuccess: () => toast.success(t('approveSuccess')),
    onError: (error) => toast.error(t('approveError', { message: errorMessageOf(error) })),
  });
  const { mutateAsync: rejectRequest, isPending: isRejecting } = useRejectPurchaseRequest({
    onSuccess: () => toast.success(t('rejectSuccess')),
    onError: (error) => toast.error(t('rejectError', { message: errorMessageOf(error) })),
  });

  const requests = requestData?.content || [];
  const pageInfo = requestData?.page;

  const totalPages = pageInfo?.totalPages ?? 1;

  const handleViewDetail = (request: PurchaseRequestListItem): void => {
    openModal(PurchaseRequestDetailModal, {
      title: t('detailModalTitle'),
      purchaseRequestId: request.purchaseRequisitionId,
    });
  };

  const handleViewRequestModal = () => {
    openModal(PurchaseRequestFormModal, {
      title: t('formModalTitle'),
      height: '800px',
    });
  };

  const handleApprove = (purchaseRequestId: string) => {
    openModal(ConfirmModal, {
      title: t('confirmApprove'),
      onConfirm: () => approveRequest(purchaseRequestId),
    });
  };

  const handleReject = (purchaseRequestId: string) => {
    openModal(ConfirmModal, {
      title: t('confirmReject'),
      reason: { label: tc('rejectReason'), required: tc('rejectReasonRequired') },
      onConfirm: (comment) => rejectRequest({ purchaseRequestId, comment }),
    });
  };

  const columns: TableColumn<PurchaseRequestListItem>[] = [
    {
      key: 'purchaseRequisitionNumber',
      label: t('columns.number'),
      render: (_, r) => (
        <div className="flex flex-col">
          <span>{r.purchaseRequisitionNumber}</span>
        </div>
      ),
    },
    { key: 'requesterName', label: t('columns.requester') },
    { key: 'departmentName', label: t('columns.department') },
    {
      key: 'requestDate',
      label: t('columns.requestDate'),
      render: (_, r) => formatDateTime(r.requestDate),
    },
    {
      key: 'totalAmount',
      label: t('columns.totalAmount'),
      render: (_, r) => formatCurrency(r.totalAmount),
    },
    {
      key: 'statusCode',
      label: t('columns.status'),
      render: (_, r) => <StatusLabel statusCode={r.statusCode} />,
    },
    {
      key: 'action',
      label: t('columns.action'),
      align: 'right',
      render: (_, r) => (
        <div className="flex items-center justify-end gap-0.5 -my-1">
          <Button
            label={tc('detail')}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100 px-2"
            onClick={() => handleViewDetail(r)}
          />
          {canDecide && r.statusCode === 'PENDING' && (
            <>
              <Button
                label={tc('approve')}
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => handleApprove(r.purchaseRequisitionId)}
                loading={isApproving}
                disabled={isRejecting}
              />
              <Button
                label={tc('reject')}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 px-2"
                onClick={() => handleReject(r.purchaseRequisitionId)}
                loading={isRejecting}
                disabled={isApproving}
              />
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      {/* 필터 헤더. 아래 표가 위 테두리를 그리므로 아래 선을 두지 않는다 */}
      <div className="flex justify-between items-center shrink-0">
        {/* <CalendarButton /> */}
        <DateRangePicker
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
        />
        <div className="flex items-center space-x-4">
          <Dropdown
            placeholder={tc('allStatuses')}
            items={optionLabels(purchaseRequestStatusOptions)}
            value={selectedStatus}
            onChange={(status: string): void => {
              setSelectedStatus(status);
              setCurrentPage(1);
            }}
          />

          <SearchBar
            options={optionLabels(purchaseRequestSearchTypeOptions, {
              NUMBER: t('searchOption.NUMBER'),
              REQUESTER: t('searchOption.REQUESTER'),
            })}
            onTypeChange={(type) => {
              setSelectedSearchType(type);
            }}
            onKeywordSearch={(keyword) => {
              setKeyword(keyword);
              setCurrentPage(1); // 검색 시 페이지 초기화
            }}
            placeholder={tc('searchPlaceholder')}
          />

          {/* 구매 요청 작성 버튼 */}
          <Button label={t('create')} onClick={handleViewRequestModal} />
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox type="loading" message={t('loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('loadError')} error={error} />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={requests}
          keyExtractor={(row) => row.purchaseRequisitionId}
          emptyMessage={t('empty')}
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
