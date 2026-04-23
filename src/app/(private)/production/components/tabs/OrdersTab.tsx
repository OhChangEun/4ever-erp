'use client';
import { useMemo, useState } from 'react';
import Dropdown from '@/app/components/common/Dropdown';
import Button from '@/app/components/common/Button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMrpAvailableStatusDropdown,
  fetchMrpOrdersList,
  fetchMrpQuotationsDropdown,
  postMrpConvert,
} from '../../api/production.api';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import Pagination from '@/app/components/common/Pagination';
import Table, { TableColumn } from '@/app/components/common/Table';
import {
  FetchMrpOrdersListParams,
  MrpOrdersListData,
  MrpOrdersListResponse,
} from '../../types/MrpOrdersApiType';
import { MrpOrdersConvertReqeustBody } from '../../types/MrpOrdersConvertApiType';
import { useRouter } from 'next/navigation';
import { useDropdown } from '@/app/hooks/useDropdown';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useToast } from '@/app/components/common/toast/useToast';

interface OrdersTabProps {
  tabButtons?: React.ReactNode;
}

export default function OrdersTab({ tabButtons }: OrdersTabProps) {
  // mrp 순소요 - 견적 드롭다운
  const { options: mrpQuotationOptions } = useDropdown(
    'mrpQuotationsDropdown',
    fetchMrpQuotationsDropdown,
  );
  const toast = useToast();
  // mrp 순소요 - 가용 재고 상태 드롭다운
  const { options: mrpAvailableStatusOptions } = useDropdown(
    'mrpAvailableStatusDropdown',
    fetchMrpAvailableStatusDropdown,
  );

  const [selectedQuote, setSelectedQuote] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('');

  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const queryParams = useMemo(
    (): FetchMrpOrdersListParams => ({
      quotationId: selectedQuote,
      availableStatusCode: selectedStockStatus,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedQuote, selectedStockStatus, currentPage],
  );

  const {
    data: orders,
    isLoading,
    isError,
  } = useQuery<MrpOrdersListResponse>({
    queryKey: ['mrpOrdersList', queryParams],
    queryFn: ({ queryKey }) => fetchMrpOrdersList(queryKey[1] as FetchMrpOrdersListParams),
    staleTime: 1000,
  });

  const orderItems: MrpOrdersListData[] = orders?.content ?? [];
  const pageInfo = orders?.page;

  const totalPages = pageInfo?.totalPages ?? 1;

  const handleSelectAllRequirements = () => {
    if (!orders) return;
    if (selectedRequirements.length === orderItems.length) {
      setSelectedRequirements([]);
    } else {
      setSelectedRequirements(orderItems.map((item) => item.itemId));
    }
  };

  const handleRequirementSelection = (id: string) => {
    setSelectedRequirements((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  };

  // 계획 주문 전환 mutation
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate: mrpConvert } = useMutation({
    mutationFn: (body: MrpOrdersConvertReqeustBody) => postMrpConvert(body),
    onSuccess: () => {
      toast.success('계획 주문 전환이 완료되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['mrpOrdersList'] });
      router.push('/production?tab=mrp&subTab=orders');
    },
    onError: (error) => {
      console.log('계획 주문 전환 실패', error);
      toast.success('계획 주문 전환에 실패했습니다.');
    },
  });

  // 계획 주문 전환 실행
  const handleConvertToPlannedOrder = () => {
    if (selectedRequirements.length === 0) {
      toast.success('전환할 항목을 선택해주세요.');
      return;
    }

    const selectedItems = orderItems
      .filter((item) => selectedRequirements.includes(item.itemId))
      .map((item) => ({
        quotationId: item.quotationId,
        itemId: item.itemId,
        quantity: item.requiredQuantity,
      }));

    const body = {
      items: selectedItems,
    };

    mrpConvert(body);
  };

  // --- 컨럼 정의 ---
  const columns: TableColumn<MrpOrdersListData>[] = [
    {
      key: 'itemId',
      label: '',
      width: '48px',
      align: 'center',
      headerRender: () => (
        <input
          type="checkbox"
          checked={
            selectedRequirements.length > 0 && selectedRequirements.length === orderItems.length
          }
          onChange={handleSelectAllRequirements}
          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
        />
      ),
      render: (_, item) =>
        item.convertStatus !== 'NOT_CONVERTED' ? (
          <input type="checkbox" disabled className="rounded border-gray-300 text-gray-300" />
        ) : (
          <input
            type="checkbox"
            checked={selectedRequirements.includes(item.itemId)}
            onChange={() => handleRequirementSelection(item.itemId)}
            className="rounded border-gray-300 cursor-pointer"
          />
        ),
    },
    { key: 'itemName', label: '자재', align: 'center' },
    {
      key: 'requiredQuantity',
      label: '소요 수량',
      align: 'center',
      render: (_, item) => <>{item.requiredQuantity.toLocaleString()}</>,
    },
    {
      key: 'availableStock',
      label: '가용 재고',
      align: 'center',
      render: (_, item) => <>{item.availableStock.toLocaleString()}</>,
    },
    {
      key: 'consumptionQuantity',
      label: '소모량',
      align: 'center',
      render: (_, item) => <>{item.consumptionQuantity.toLocaleString()}</>,
    },
    {
      key: 'availableStatusCode',
      label: '가용 재고 상태',
      align: 'center',
      render: (_, item) => <StatusLabel $statusCode={item.availableStatusCode} />,
    },
    {
      key: 'shortageQuantity',
      label: '부족 재고',
      align: 'center',
      render: (_, item) =>
        item.shortageQuantity > 0 ? (
          <span className="text-red-600 font-medium">{item.shortageQuantity.toLocaleString()}</span>
        ) : (
          <>0</>
        ),
    },
    {
      key: 'itemType',
      label: '자재 유형',
      align: 'center',
      render: (_, item) => <StatusLabel $statusCode={item.itemType} />,
    },
    {
      key: 'procurementStartDate',
      label: '구매 권장일',
      align: 'center',
      render: (_, item) => <>{item.procurementStartDate || '-'}</>,
    },
    {
      key: 'expectedArrivalDate',
      label: '예상 도착일',
      align: 'center',
      render: (_, item) => <>{item.expectedArrivalDate || '-'}</>,
    },
    { key: 'supplierCompanyName', label: '공급사', align: 'center' },
    {
      key: 'convertStatus',
      label: '전환 상태',
      align: 'center',
      render: (_, item) => <StatusLabel $statusCode={item.convertStatus} />,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center shrink-0">
        {tabButtons}
        <div className="flex gap-4 items-center">
          <Dropdown
            placeholder="견적 선택"
            items={mrpQuotationOptions}
            value={selectedQuote}
            onChange={(quote: string) => {
              setSelectedQuote(quote);
              setCurrentPage(1);
            }}
            autoSelectFirst
          />
          <Dropdown
            placeholder="전체 상태"
            items={mrpAvailableStatusOptions}
            value={selectedStockStatus}
            onChange={(status: string) => {
              setSelectedStockStatus(status);
              setCurrentPage(1);
            }}
          />
          <Button
            label="계획 주문 전환"
            onClick={handleConvertToPlannedOrder}
            disabled={selectedRequirements.length === 0}
          />
        </div>
      </div>

      {isLoading ? (
        <TableStatusBox $type="loading" $message="순소요 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox $type="error" $message="순소요 목록을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <Table
          columns={columns}
          data={orderItems}
          keyExtractor={(row) => row.itemId}
          emptyMessage="조회된 순소요 데이터가 없습니다"
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
