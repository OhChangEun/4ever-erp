'use client';

import { useMemo, useState } from 'react';
import CustomerDetailModal from '@/app/(private)/sales/components/modals/CustomerDetailModal';
import NewCustomerModal from '@/app/(private)/sales/components/modals/NewCustomerModal';
import { CustomerStatus } from '@/app/(private)/sales/types/SalesCustomerListType';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCustomerList } from '../../sales.api';
import { customerKeys } from '@/app/(private)/sales/sales.keys';
import { useDebounce } from 'use-debounce';
import { CustomerDetail } from '../../types/SalesCustomerDetailType';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import {
  CUSTOMER_SEARCH_KEYWORD_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
} from '@/app/(private)/sales/constant';
import Pagination from '@/app/components/common/Pagination';
import StatusLabel from '@/app/components/common/StatusLabel';
import SearchBar from '@/app/components/common/SearchBar';
import Dropdown from '@/app/components/common/Dropdown';
import { useModal } from '@/app/components/common/modal/useModal';
import Table, { TableColumn } from '@/app/components/common/Table';

import { formatCurrency } from '@/app/utils/number';
import Button from '@/app/components/common/Button';
const CustomerList = () => {
  const { openModal } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('customerName');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus>('ALL');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 200);
  const [currentPage, setCurrentPage] = useState(1);

  const handleCustomerRegisterClick = () => {
    openModal(NewCustomerModal, { width: '1190px', title: '신규 고객 등록' });
  };

  const queryParams = useMemo(
    () => ({
      page: currentPage - 1,
      size: 10,
      status: statusFilter || 'ALL',
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
      title: '고객 상세 정보',
      selectedCustomerId: id,
    });
  };

  const totalPages = pageInfo?.totalPages ?? 1;

  type CustomerItem = (typeof customers)[0];
  const columns: TableColumn<CustomerItem>[] = [
    {
      key: 'customerName',
      label: '고객사',
      render: (_, customer) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{customer.customerName}</div>
          <div className="text-xs text-gray-500">{customer.customerNumber}</div>
        </div>
      ),
    },
    {
      key: 'manager',
      label: '담당자',
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
      label: '주소',
      render: (_, customer) => (
        <div className="text-sm text-gray-900 max-w-xs truncate">{customer.address}</div>
      ),
    },
    {
      key: 'totalTransactionAmount',
      label: '거래액',
      align: 'right',
      render: (_, customer) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {formatCurrency(customer.totalTransactionAmount)}
          </div>
          <div className="text-xs text-gray-500">{customer.orderCount}건</div>
        </div>
      ),
    },
    {
      key: 'statusCode',
      label: '상태',
      render: (_, customer) => <StatusLabel statusCode={customer.statusCode} />,
    },
    {
      key: 'action',
      label: '작업',
      align: 'right',
      render: (_, customer) => (
        <Button
          label="상세"
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
          placeholder="전체 상태"
          items={CUSTOMER_STATUS_OPTIONS}
          value={statusFilter}
          onChange={(status: string) => setStatusFilter(status as CustomerStatus)}
          autoSelectFirst
        />
        <SearchBar
          options={CUSTOMER_SEARCH_KEYWORD_OPTIONS}
          onTypeChange={(type: string) => setSearchType(type)}
          onKeywordSearch={(keyword) => {
            setSearchTerm(keyword);
            setCurrentPage(1);
          }}
          placeholder="검색어를 입력하세요"
        />
        <Button onClick={handleCustomerRegisterClick} label="고객 등록" />
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <TableStatusBox type="loading" message="고객 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox type="error" message="고객 목록을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={customers}
          keyExtractor={(row) => row.customerId}
          emptyMessage="고객 정보가 없습니다."
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
