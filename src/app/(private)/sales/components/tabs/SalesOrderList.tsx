'use client';

import { useMemo, useState } from 'react';
import SalesOrderDetailModal from '@/app/(private)/sales/components/modals/SalesOrderDetailModal';
import { type OrderStatus } from '@/app/(private)/sales/types/SalesOrderListType';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { getOrderList } from '../../sales.api';
import { salesOrderKeys } from '@/app/(private)/sales/sales.keys';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { getOrderSearchKeywordOptions, ORDER_STATUS_OPTIONS } from '@/app/(private)/sales/constant';
import { Pagination } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useRole } from '@/app/hooks/useRole';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import { Dropdown } from '@everp/ui';
import { SearchBar } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import { Table, type TableColumn } from '@everp/ui';

import { formatCurrency } from '@/app/utils/number';
import { Button } from '@everp/ui';
import { useTranslations } from 'next-intl';
const SalesOrderList = () => {
  const { openModal } = useModal();
  const t = useTranslations('sales.orderList');
  const tc = useTranslations('sales.common');
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
      status: statusFilter,
    }),
    [startDate, endDate, currentPage, statusFilter, debouncedSearchTerm, searchType],
  );
  const {
    data: orderRes,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: salesOrderKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => getOrderList(queryParams),
  });

  const orders = orderRes?.data ?? [];
  const pageInfo = orderRes?.pageData;

  const handleViewOrder = (id: string) => {
    openModal(SalesOrderDetailModal, {
      width: '900px',
      title: t('detailModalTitle'),
      selectedSalesOrderId: id,
    });
  };

  const totalPages = pageInfo?.totalPages ?? 1;

  const role = useRole();
  const orderOptions = getOrderSearchKeywordOptions(role).map((code) => ({
    key: code,
    value: t(`searchType.${code}`),
  }));
  const statusOptions = ORDER_STATUS_OPTIONS.map((code) => ({
    key: code,
    value: t(`statusFilter.${code}`),
  }));

  type OrderItem = (typeof orders)[0];
  const columns: TableColumn<OrderItem>[] = [
    {
      key: 'salesOrderNumber',
      label: t('columns.number'),
      render: (_, order) => (
        <div className="text-sm font-medium text-gray-900">{order.salesOrderNumber}</div>
      ),
    },
    {
      key: 'customerName',
      label: t('columns.customer'),
      render: (_, order) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
          <div className="text-sm text-gray-500">
            {order.manager.managerName} · {order.manager.managerPhone}
          </div>
        </div>
      ),
    },
    { key: 'orderDate', label: t('columns.orderDate') },
    { key: 'dueDate', label: t('columns.dueDate') },
    {
      key: 'totalAmount',
      label: t('columns.totalAmount'),
      align: 'right',
      render: (_, order) => formatCurrency(order.totalAmount),
    },
    {
      key: 'statusCode',
      label: t('columns.status'),
      render: (_, order) => <StatusLabel statusCode={order.statusCode} />,
    },
    {
      key: 'action',
      label: t('columns.action'),
      align: 'right',
      render: (_, order) => (
        <Button
          label={tc('detail')}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:bg-gray-100 px-2"
          onClick={() => handleViewOrder(order.salesOrderId)}
        />
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
            placeholder={tc('allStatuses')}
            items={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            autoSelectFirst
          />
          <SearchBar
            options={orderOptions}
            onTypeChange={(type: string) => setSearchType(type)}
            onKeywordSearch={(keyword) => {
              setSearchTerm(keyword);
              setCurrentPage(1);
            }}
            placeholder={tc('searchPlaceholder')}
          />
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <TableStatusBox type="loading" message={t('loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('loadError')} />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={orders}
          keyExtractor={(row) => row.salesOrderId}
          emptyMessage={t('empty')}
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
