'use client';

import { useMemo, useState } from 'react';
import SalesOrderDetailModal from '@/app/(private)/sales/components/modals/SalesOrderDetailModal';
import { OrderQueryParams, OrderStatus } from '@/app/(private)/sales/types/SalesOrderListType';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { getOrderList } from '../../sales.api';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import {
  getOrderSearchKeywordOptions,
  ORDER_LIST_TABLE_HEADERS,
  ORDER_STATUS_OPTIONS,
} from '@/app/(private)/sales/constant';
import Pagination from '@/app/components/common/Pagination';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useRole } from '@/app/hooks/useRole';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import SearchBar from '@/app/components/common/SearchBar';
import { useModal } from '@/app/components/common/modal/useModal';
import Table, { TableColumn } from '@/app/components/common/Table';

const SalesOrderList = () => {
  const { openModal } = useModal();
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('salesOrderNumber');

  const [statusFilter, setStatusFilter] = useState<OrderStatus>('ALL');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 200);
  const [currentPage, setCurrentPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      start: startDate || '',
      end: endDate || '',
      page: currentPage - 1,
      size: 10,
      keyword: debouncedSearchTerm || '',
      type: searchType || '',
      status: statusFilter || 'ALL',
    }),
    [startDate, endDate, currentPage, statusFilter, debouncedSearchTerm, searchType],
  );
  const {
    data: orderRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['orderList', queryParams],
    queryFn: ({ queryKey }) => getOrderList(queryKey[1] as OrderQueryParams),
  });

  const orders = orderRes?.data ?? [];
  const pageInfo = orderRes?.pageData;

  const handleViewOrder = (id: string) => {
    setSelectedSalesOrderId(id);
    openModal(SalesOrderDetailModal, {
      width: '900px',
      title: `주문 상세 정보`,
      $selectedSalesOrderId: id,
    });
  };

  const totalPages = pageInfo?.totalPages ?? 1;

  const role = useRole();
  const orderOptions = getOrderSearchKeywordOptions(role as string);

  type OrderItem = (typeof orders)[0];
  const columns: TableColumn<OrderItem>[] = [
    {
      key: 'salesOrderNumber',
      label: '주문번호',
      render: (_, order) => (
        <div className="text-sm font-medium text-gray-900">{order.salesOrderNumber}</div>
      ),
    },
    {
      key: 'customerName',
      label: '고객사',
      render: (_, order) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
          <div className="text-sm text-gray-500">
            {order.manager.managerName} · {order.manager.managerPhone}
          </div>
        </div>
      ),
    },
    { key: 'orderDate', label: '주문일' },
    { key: 'dueDate', label: '납기일' },
    {
      key: 'totalAmount',
      label: '총금액',
      align: 'right',
      render: (_, order) => `₩${order.totalAmount.toLocaleString()}`,
    },
    {
      key: 'statusCode',
      label: '상태',
      align: 'center',
      render: (_, order) => <StatusLabel $statusCode={order.statusCode} />,
    },
    {
      key: 'action',
      label: '작업',
      align: 'center',
      render: (_, order) => (
        <button
          onClick={() => handleViewOrder(order.salesOrderId)}
          className="text-blue-600 hover:text-blue-900 cursor-pointer"
          title="상세보기"
        >
          <i className="ri-eye-line"></i>
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* 헤더 */}
      <div className="border-b border-gray-200 flex justify-between items-center gap-4 py-2 shrink-0">
        {/* 날짜 필터 */}
        <DateRangePicker
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
        />
        <div className="flex gap-2">
          <Dropdown
            placeholder="전체 상태"
            items={ORDER_STATUS_OPTIONS}
            value={statusFilter}
            onChange={(status: string) => setStatusFilter(status as OrderStatus)}
            autoSelectFirst
          />
          <SearchBar
            options={orderOptions}
            onTypeChange={(type: string) => setSearchType(type)}
            onKeywordSearch={(keyword) => {
              setSearchTerm(keyword);
              setCurrentPage(1);
            }}
            placeholder="검색어를 입력하세요"
          />
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <TableStatusBox $type="loading" $message="주문 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox $type="error" $message="주문 목록을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <Table
          columns={columns}
          data={orders}
          keyExtractor={(row) => row.salesOrderId}
          emptyMessage="등록된 주문서가 없습니다."
          className="flex-1 min-h-0"
        />
      )}
      {/* 페이지네이션 */}
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
};

export default SalesOrderList;
