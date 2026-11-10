'use client';

import { useMemo, useState } from 'react';
import CustomerDetailModal from '@/app/(private)/sales/components/modals/CustomerDetailModal';
import NewCustomerModal from '@/app/(private)/sales/components/modals/NewCustomerModal';
import { type CustomerStatus } from '@/app/(private)/sales/types/SalesCustomerListType';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCustomerList } from '../../sales.api';
import { customerKeys } from '@/app/(private)/sales/sales.keys';
import { useDebounce } from 'use-debounce';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import {
  CUSTOMER_SEARCH_KEYWORD_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
} from '@/app/(private)/sales/constant';
import { Pagination } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { SearchBar } from '@everp/ui';
import { Dropdown } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import { Table, type TableColumn } from '@everp/ui';

import { formatCurrency } from '@/app/utils/number';
import { Button } from '@everp/ui';
import { useTranslations } from 'next-intl';
const CustomerList = () => {
  const { openModal } = useModal();
  const t = useTranslations('sales.customerList');
  const tc = useTranslations('sales.common');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('customerName');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus>('ALL');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 200);
  const [currentPage, setCurrentPage] = useState(1);

  const handleCustomerRegisterClick = () => {
    openModal(NewCustomerModal, { width: '1190px', title: t('createModalTitle') });
  };

  const queryParams = useMemo(
    () => ({
      page: currentPage - 1,
      size: 10,
      status: statusFilter,
      type: searchType || '',
      keyword: debouncedSearchTerm || '',
    }),
    [currentPage, statusFilter, debouncedSearchTerm, searchType],
  );
  const {
    data: customerRes,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: customerKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => getCustomerList(queryParams),
  });

  const customers = customerRes?.data ?? [];
  const pageInfo = customerRes?.pageData;
  console.log(pageInfo);

  const handleViewClick = (id: string) => {
    openModal(CustomerDetailModal, {
      width: '900px',
      height: '1050px',
      title: t('detailModalTitle'),
      selectedCustomerId: id,
    });
  };

  const totalPages = pageInfo?.totalPages ?? 1;

  const statusOptions = CUSTOMER_STATUS_OPTIONS.map((code) => ({
    key: code,
    value: t(`statusFilter.${code}`),
  }));
  const searchOptions = CUSTOMER_SEARCH_KEYWORD_OPTIONS.map((code) => ({
    key: code,
    value: t(`searchType.${code}`),
  }));

  type CustomerItem = (typeof customers)[0];
  const columns: TableColumn<CustomerItem>[] = [
    {
      key: 'customerName',
      label: t('columns.customer'),
      render: (_, customer) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{customer.customerName}</div>
          <div className="text-xs text-gray-500">{customer.customerNumber}</div>
        </div>
      ),
    },
    {
      key: 'manager',
      label: t('columns.manager'),
      render: (_, customer) => (
        <div>
          <div className="text-sm text-gray-900">{customer.manager.managerName}</div>
          <div className="text-xs text-gray-500">{customer.manager.managerPhone}</div>
          <div className="text-xs text-gray-500">{customer.manager.managerEmail}</div>
        </div>
      ),
    },
    {
      key: 'address',
      label: t('columns.address'),
      render: (_, customer) => (
        <div className="text-sm text-gray-900 max-w-xs truncate">{customer.address}</div>
      ),
    },
    {
      key: 'totalTransactionAmount',
      label: t('columns.transactionAmount'),
      align: 'right',
      render: (_, customer) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {formatCurrency(customer.totalTransactionAmount)}
          </div>
          <div className="text-xs text-gray-500">
            {tc('orderCount', { count: customer.orderCount })}
          </div>
        </div>
      ),
    },
    {
      key: 'statusCode',
      label: t('columns.status'),
      render: (_, customer) => <StatusLabel statusCode={customer.statusCode} />,
    },
    {
      key: 'action',
      label: t('columns.action'),
      align: 'right',
      render: (_, customer) => (
        <Button
          label={tc('detail')}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:bg-gray-100 px-2"
          onClick={() => handleViewClick(customer.customerId)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* 헤더 */}
      <div className="border-b border-gray-200 flex justify-end items-center gap-4 py-2 shrink-0">
        <Dropdown
          placeholder={tc('allStatuses')}
          items={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          autoSelectFirst
        />
        <SearchBar
          options={searchOptions}
          onTypeChange={(type: string) => setSearchType(type)}
          onKeywordSearch={(keyword) => {
            setSearchTerm(keyword);
            setCurrentPage(1);
          }}
          placeholder={tc('searchPlaceholder')}
        />
        <Button onClick={handleCustomerRegisterClick} label={t('create')} />
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
          data={customers}
          keyExtractor={(row) => row.customerId}
          emptyMessage={t('empty')}
          className="flex-1 min-h-0"
        />
      )}
      {/* 페이지네이션 */}
      {!isLoading && !isError && customers.length > 0 && (
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

export default CustomerList;
