'use client';
import { useState, useMemo } from 'react';
import { Button } from '@everp/ui';
import { Dropdown } from '@everp/ui';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchMrpPlannedOrderQuotationsDropdown,
  fetchMrpPlannedOrdersList,
  fetchMrpPlannedOrderStatusDropdown,
} from '@/app/(private)/production/api/production.api';
import {
  type FetchMrpPlannedOrdersListParams,
  type MrpPlannedOrderList,
  type MrpPlannedOrdersListResponse,
} from '@/app/(private)/production/types/MrpPlannedOrdersListApiType';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Pagination } from '@everp/ui';
import { Table, type TableColumn } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import MrpPurchaseRequestModal from '@/app/(private)/production/components/modals/MrpPurchaseRequestModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import StatusLabel from '@/app/components/common/StatusLabel';
import { mrpPlannedOrderKeys } from '@/app/(private)/production/api/production.keys';
import { useTranslations } from 'next-intl';
import { useOptionLabels } from '@/app/hooks/useOptionLabels';
import { formatNumber } from '@/app/utils/number';
import { useRole } from '@/app/hooks/useRole';
import { hasRole, MRP_PURCHASE_REQUEST_ROLES } from '@/lib/authz/policy';

interface PlannedOrdersTabProps {
  tabButtons?: React.ReactNode;
}

export default function PlannedOrdersTab({ tabButtons }: PlannedOrdersTabProps) {
  const t = useTranslations('production');
  const optionLabels = useOptionLabels();
  const { openModal } = useModal();
  // 구매 요청 모달은 재고(IM) API 다음 구매(MM) API 를 부른다. 둘 다 통과하는 역할만 버튼을 본다
  const canRequestPurchase = hasRole(MRP_PURCHASE_REQUEST_ROLES, useRole());

  // mrp 계획주문 견적 드롭다운
  const { options: mrpQuotationOptions } = useDropdown(
    'mrpPlannedOrderQuotationsDropdown',
    fetchMrpPlannedOrderQuotationsDropdown,
  );

  // mrp 계획주문 상태 드롭다운
  const { options: mrpStatusOptions } = useDropdown(
    'mrpPlannedOrderStatusDropdown',
    fetchMrpPlannedOrderStatusDropdown,
  );

  // 드롭다운 상태
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedQutations, setSelectedQutations] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL'); // 코드 목록은 서버 드롭다운이 정한다

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 쿼리 파라미터 객체 생성
  const queryParams = useMemo(
    (): FetchMrpPlannedOrdersListParams => ({
      status: selectedStatus,
      quotationId: selectedQutations,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedStatus, selectedQutations, currentPage],
  );

  // API 호출
  const {
    data: plannedOrdersData,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery<MrpPlannedOrdersListResponse>({
    queryKey: mrpPlannedOrderKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchMrpPlannedOrdersList(queryParams),
  });

  // content 배열 추출
  // 다시 받기가 실패하면 캐시에 처리 전 목록이 남는다. 그 값으로 고르면 같은 쓰기가 또 가니 행이 없는 것으로 본다(표는 오류 상자)
  const plannedOrders = isError ? [] : plannedOrdersData?.content || [];
  const pageInfo = plannedOrdersData?.page;

  const totalPages = pageInfo?.totalPages ?? 1;

  // 자재 구매 요청은 INITIAL, REJECTED 주문만. 선택은 그릴 때 지금 목록의 그 주문으로 거른다(요청 뒤 다시 받으면 빠진다)
  const selectableOrders = plannedOrders
    .filter((order) => order.status === 'INITIAL' || order.status === 'REJECTED')
    .map((order) => order.mrpRunId);
  const selectedIds = selectedOrders.filter((id) => selectableOrders.includes(id));
  const allSelected = selectableOrders.length > 0 && selectedIds.length === selectableOrders.length;

  const handleSelectAllOrders = () => {
    setSelectedOrders(allSelected ? [] : selectableOrders);
  };

  const handleOrderSelection = (mrpId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(mrpId) ? prev.filter((id) => id !== mrpId) : [...prev, mrpId],
    );
  };

  const handlePurchaseRequest = () => {
    const selectedOrdersData = plannedOrders.filter((order) =>
      selectedIds.includes(order.mrpRunId),
    );

    openModal(MrpPurchaseRequestModal, {
      title: t('plannedOrders.purchaseRequest'),
      orders: selectedOrdersData,
      onConfirm: () => setSelectedOrders([]),
    });
  };

  // --- 컨럼 정의 ---
  const columns: TableColumn<MrpPlannedOrderList>[] = [
    {
      key: 'mrpRunId',
      label: '',
      width: '48px',
      headerRender: () => (
        <input
          type="checkbox"
          aria-label={t('plannedOrders.selectAll')}
          checked={allSelected}
          onChange={handleSelectAllOrders}
          className="rounded border-gray-300 cursor-pointer"
        />
      ),
      render: (_, order) => {
        const label = t('common.selectRow', { name: `${order.quotationNumber} ${order.itemName}` });
        return selectableOrders.includes(order.mrpRunId) ? (
          <input
            type="checkbox"
            aria-label={label}
            checked={selectedOrders.includes(order.mrpRunId)}
            onChange={() => handleOrderSelection(order.mrpRunId)}
            className="rounded border-gray-300 cursor-pointer"
          />
        ) : (
          <input
            type="checkbox"
            aria-label={label}
            className="rounded border-gray-300 text-gray-300"
            disabled
          />
        );
      },
    },
    {
      key: 'quotationNumber',
      label: t('common.referenceQuote'),
      render: (_, order) => (
        <span className="text-sm font-medium text-blue-600">{order.quotationNumber}</span>
      ),
    },
    { key: 'itemName', label: t('common.material') },
    {
      key: 'quantity',
      label: t('common.quantity'),
      render: (_, order) => <>{formatNumber(order.quantity)}</>,
    },
    { key: 'procurementStartDate', label: t('common.procurementStartDate') },
    {
      key: 'status',
      label: t('common.status'),
      render: (_, order) => <StatusLabel statusCode={order.status} />,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between shrink-0">
        {tabButtons}
        <div className="flex items-center gap-3">
          <Dropdown
            placeholder={t('common.selectQuote')}
            items={optionLabels(mrpQuotationOptions, { ALL: t('common.allQuotes') })}
            value={selectedQutations}
            onChange={(quotation: string) => {
              setSelectedQutations(quotation);
              setCurrentPage(1);
            }}
          />
          <Dropdown
            placeholder={t('common.allStatuses')}
            items={optionLabels(mrpStatusOptions, { ALL: t('common.allStatuses') })}
            value={selectedStatus}
            onChange={(status) => {
              setSelectedStatus(status);
              setCurrentPage(1);
            }}
          />
          {canRequestPurchase && (
            <Button
              label={t('plannedOrders.purchaseRequest')}
              onClick={handlePurchaseRequest}
              disabled={selectedIds.length === 0}
            />
          )}
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox type="loading" message={t('plannedOrders.loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('plannedOrders.loadError')} />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={plannedOrders}
          keyExtractor={(row) => row.mrpRunId}
          emptyMessage={t('plannedOrders.empty')}
          className="flex-1 min-h-0"
        />
      )}

      {!isLoading && !isError && (
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
