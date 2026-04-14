'use client';
import { useState, useMemo } from 'react';
import Button from '@/app/components/common/Button';
import Dropdown from '@/app/components/common/Dropdown';
import { MrpPlannedOrderStatus } from '@/app/(private)/production/constants';
import { useQuery } from '@tanstack/react-query';
import {
  fetchMrpPlannedOrderQuotationsDropdown,
  fetchMrpPlannedOrdersList,
  fetchMrpPlannedOrderStatusDropdown,
} from '@/app/(private)/production/api/production.api';
import {
  FetchMrpPlannedOrdersListParams,
  MrpPlannedOrderList,
  MrpPlannedOrdersListResponse,
} from '@/app/(private)/production/types/MrpPlannedOrdersListApiType';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import Pagination from '@/app/components/common/Pagination';
import Table, { TableColumn } from '@/app/components/common/Table';
import { useModal } from '@/app/components/common/modal/useModal';
import MrpPurchaseRequestModal from '@/app/(private)/production/components/modals/MrpPurchaseRequestModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import StatusLabel from '@/app/components/common/StatusLabel';

interface PlannedOrdersTabProps {
  tabButtons?: React.ReactNode;
}

export default function PlannedOrdersTab({ tabButtons }: PlannedOrdersTabProps) {
  const { openModal } = useModal();

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
  const [selectedStatus, setSelectedStatus] = useState<MrpPlannedOrderStatus>('ALL');

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
    isLoading,
    isError,
  } = useQuery<MrpPlannedOrdersListResponse>({
    queryKey: ['mrpPlannedOrders', queryParams],
    queryFn: ({ queryKey }) =>
      fetchMrpPlannedOrdersList(queryKey[1] as FetchMrpPlannedOrdersListParams),
    staleTime: 1000,
  });

  // content 배열 추출
  const plannedOrders = plannedOrdersData?.content || [];
  const pageInfo = plannedOrdersData?.page;

  const totalPages = pageInfo?.totalPages ?? 1;

  const handleSelectAllOrders = () => {
    // 선택 가능한 주문만 필터링 (INITIAL, REJECTED 제외)
    const selectableOrders = plannedOrders
      .filter((order) => order.status === 'INITIAL' || order.status === 'REJECTED')
      .map((order) => order.mrpRunId);

    // 이미 모두 선택된 경우 해제, 아니면 전체 선택
    if (selectedOrders.length === selectableOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(selectableOrders);
    }
  };

  const handleOrderSelection = (mrpId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(mrpId) ? prev.filter((id) => id !== mrpId) : [...prev, mrpId],
    );
  };

  const handlePurchaseRequest = () => {
    const selectedOrdersData = plannedOrders.filter((order) =>
      selectedOrders.includes(order.mrpRunId),
    );

    openModal(MrpPurchaseRequestModal, {
      title: '자재 구매 요청',
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
      align: 'center',
      headerRender: () => {
        const selectableOrders = plannedOrders
          .filter((o) => o.status === 'INITIAL' || o.status === 'REJECTED')
          .map((o) => o.mrpRunId);
        return (
          <input
            type="checkbox"
            checked={
              selectableOrders.length > 0 &&
              selectableOrders.every((id) => selectedOrders.includes(id))
            }
            onChange={handleSelectAllOrders}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
        );
      },
      render: (_, order) =>
        order.status === 'INITIAL' || order.status === 'REJECTED' ? (
          <input
            type="checkbox"
            checked={selectedOrders.includes(order.mrpRunId)}
            onChange={() => handleOrderSelection(order.mrpRunId)}
            className="rounded border-gray-300 cursor-pointer"
          />
        ) : (
          <input type="checkbox" className="rounded border-gray-300 text-gray-300" disabled />
        ),
    },
    {
      key: 'quotationNumber',
      label: '참조 견적서',
      align: 'center',
      render: (_, order) => (
        <span className="text-sm font-medium text-blue-600">{order.quotationNumber}</span>
      ),
    },
    { key: 'itemName', label: '자재', align: 'center' },
    {
      key: 'quantity',
      label: '수량',
      align: 'center',
      render: (_, order) => <>{order.quantity.toLocaleString()}</>,
    },
    { key: 'procurementStartDate', label: '구매 권장일', align: 'center' },
    {
      key: 'status',
      label: '상태',
      align: 'center',
      render: (_, order) => <StatusLabel $statusCode={order.status} />,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between shrink-0">
        {tabButtons}
        <div className="flex items-center gap-3">
          <Dropdown
            placeholder="견적 선택"
            items={mrpQuotationOptions}
            value={selectedQutations}
            onChange={(quotation: string) => {
              setSelectedQutations(quotation);
              setCurrentPage(1);
            }}
          />
          <Dropdown
            placeholder="전체 상태"
            items={mrpStatusOptions}
            value={selectedStatus}
            onChange={(status: MrpPlannedOrderStatus) => {
              setSelectedStatus(status);
              setCurrentPage(1);
            }}
          />
          <Button
            label="자재 구매 요청"
            onClick={handlePurchaseRequest}
            disabled={selectedOrders.length === 0}
          />
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox $type="loading" $message="계획 주문 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox
          $type="error"
          $message="계획 주문 목록을 불러오는 중 오류가 발생했습니다."
        />
      ) : (
        <Table
          columns={columns}
          data={plannedOrders}
          keyExtractor={(row) => row.mrpRunId}
          emptyMessage="조회된 계획 주문 데이터가 없습니다"
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
