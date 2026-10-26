'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  RECEIVING_COMPLETED_TABLE_HEADERS,
  RECEIVING_PENDING_TABLE_HEADERS,
} from '../../inventory.constants';
import { useQuery } from '@tanstack/react-query';
import { getPendingList, getReceivedList } from '../../inventory.api';
import { ManageMentCommonQueryParams } from '../../types/ShippingManagementListType';
import StatusLabel from '@/app/components/common/StatusLabel';
import Pagination from '@/app/components/common/Pagination';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import Table, { TableColumn } from '@/app/components/common/Table';
import { receivingKeys } from '@/app/(private)/inventory/inventory.keys';
const ReceivingManagementList = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubTab, setSelectedSubTab] = useState('pending');

  const getTableHeader = () => {
    return selectedSubTab === 'pending'
      ? RECEIVING_PENDING_TABLE_HEADERS
      : RECEIVING_COMPLETED_TABLE_HEADERS;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubTab]);

  const queryPendingParams = useMemo(() => {
    const params: ManageMentCommonQueryParams = {
      page: currentPage - 1,
      size: 10,
    };
    return params;
  }, [currentPage]);

  const {
    data: PendingRes,
    isLoading: isPendingLoading,
    isError: isPendingError,
  } = useQuery({
    queryKey: receivingKeys.pendingList(queryPendingParams),
    queryFn: () => getPendingList(queryPendingParams),
  });

  const queryReceivedParams = useMemo(() => {
    const params: ManageMentCommonQueryParams = {
      page: currentPage - 1,
      size: 10,
      startDate: startDate || '',
      endDate: endDate || '',
    };
    return params;
  }, [currentPage, startDate, endDate]);

  const {
    data: ReceivedRes,
    isLoading: isReceivedLoading,
    isError: isReceivedError,
  } = useQuery({
    queryKey: receivingKeys.receivedList(queryReceivedParams),
    queryFn: () => getReceivedList(queryReceivedParams),
  });

  const isCurrentLoading = selectedSubTab === 'pending' ? isPendingLoading : isReceivedLoading;
  const isCurrentError = selectedSubTab === 'pending' ? isPendingError : isReceivedError;
  const currentRes = selectedSubTab === 'pending' ? PendingRes : ReceivedRes;

  const currentData = currentRes?.data ?? [];
  const pageInfo = currentRes?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  const receivingStatusTabs = [
    { id: 'pending', name: '입고 대기', count: PendingRes?.pageData.totalElements },
    { id: 'received', name: '입고 완료', count: ReceivedRes?.pageData.totalElements },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">입고 관리</h2>

          {/* 필터링 */}
          {selectedSubTab === 'received' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 p-6 overflow-hidden">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6 shrink-0">
          {receivingStatusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSubTab(tab.id)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                selectedSubTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {isReceivedLoading || isPendingLoading ? (
            <TableStatusBox type="loading" message="입고 목록을 불러오는 중입니다..." />
          ) : isReceivedError || isPendingError ? (
            <TableStatusBox type="error" message="입고 목록을 불러오는 중 오류가 발생했습니다." />
          ) : (
            <Table
              columns={[
                { key: 'purchaseOrderNumber', label: '납품서 번호' },
                { key: 'supplierCompanyName', label: '공급업체' },
                {
                  key: 'orderDate',
                  label: '주문일',
                  render: (_, row) => row.orderDate.slice(0, 10),
                },
                {
                  key: 'dueDate',
                  label: '낙기일',
                  render: (_, row) => row.dueDate.slice(0, 10),
                },
                {
                  key: 'totalAmount',
                  label: '총금액',
                  align: 'right',
                  render: (_, row) => `₩${row.totalAmount.toLocaleString()}`,
                },
                {
                  key: 'statusCode',
                  label: '상태',
                  align: 'center',
                  render: (_, row) => <StatusLabel statusCode={row.statusCode} />,
                },
              ]}
              data={currentData}
              keyExtractor={(row) => row.purchaseOrderId}
              emptyMessage="등록된 입고 정보가 없습니다."
              className="flex-1 min-h-0"
            />
          )}
        </div>
        {/* 페이지네이션 */}
        {isCurrentError || isCurrentLoading ? null : (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalElements={pageInfo?.totalElements}
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </div>
    </div>
  );
};

export default ReceivingManagementList;
