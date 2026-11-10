'use client';

import { useMemo, useState } from 'react';
import {} from '../../inventory.constants';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getPendingList, getReceivedList } from '../../inventory.api';
import { type ManageMentCommonQueryParams } from '../../types/ShippingManagementListType';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Pagination } from '@everp/ui';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import DateRangePicker from '@/app/components/common/DateRangePicker';
import { Table } from '@everp/ui';
import { receivingKeys } from '@/app/(private)/inventory/inventory.keys';
import { formatCurrency } from '@/app/utils/number';
import { useTranslations } from 'next-intl';
const ReceivingManagementList = () => {
  const t = useTranslations('inventory');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubTab, setSelectedSubTab] = useState('pending');

  const queryPendingParams = useMemo(() => {
    const params: ManageMentCommonQueryParams = {
      page: currentPage - 1,
      size: 10,
    };
    return params;
  }, [currentPage]);

  const {
    data: PendingRes,
    isPlaceholderData: isPendingPlaceholder,
    isLoading: isPendingLoading,
    isError: isPendingError,
  } = useQuery({
    queryKey: receivingKeys.pendingList(queryPendingParams),
    placeholderData: keepPreviousData,
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
    isPlaceholderData: isReceivedPlaceholder,
    isLoading: isReceivedLoading,
    isError: isReceivedError,
  } = useQuery({
    queryKey: receivingKeys.receivedList(queryReceivedParams),
    placeholderData: keepPreviousData,
    queryFn: () => getReceivedList(queryReceivedParams),
  });

  const isCurrentLoading = selectedSubTab === 'pending' ? isPendingLoading : isReceivedLoading;
  const isCurrentError = selectedSubTab === 'pending' ? isPendingError : isReceivedError;
  const currentRes = selectedSubTab === 'pending' ? PendingRes : ReceivedRes;

  const currentData = currentRes?.data ?? [];
  const pageInfo = currentRes?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  const receivingStatusTabs = [
    {
      id: 'pending',
      name: t('receiving.subTabs.pending'),
      count: PendingRes?.pageData.totalElements,
    },
    {
      id: 'received',
      name: t('receiving.subTabs.received'),
      count: ReceivedRes?.pageData.totalElements,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('receiving.title')}</h2>

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
              onClick={() => {
                setSelectedSubTab(tab.id);
                setCurrentPage(1);
              }}
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
            <TableStatusBox type="loading" message={t('receiving.loading')} />
          ) : isReceivedError || isPendingError ? (
            <TableStatusBox type="error" message={t('receiving.loadError')} />
          ) : (
            <Table
              isStale={selectedSubTab === 'pending' ? isPendingPlaceholder : isReceivedPlaceholder}
              columns={[
                { key: 'purchaseOrderNumber', label: t('receiving.columns.purchaseOrderNumber') },
                { key: 'supplierCompanyName', label: t('receiving.columns.supplierCompanyName') },
                {
                  key: 'orderDate',
                  label: t('receiving.columns.orderDate'),
                  render: (_, row) => row.orderDate.slice(0, 10),
                },
                {
                  key: 'dueDate',
                  label: t('receiving.columns.dueDate'),
                  render: (_, row) => row.dueDate.slice(0, 10),
                },
                {
                  key: 'totalAmount',
                  label: t('receiving.columns.totalAmount'),
                  align: 'right',
                  render: (_, row) => formatCurrency(row.totalAmount),
                },
                {
                  key: 'statusCode',
                  label: t('receiving.columns.statusCode'),
                  render: (_, row) => <StatusLabel statusCode={row.statusCode} />,
                },
              ]}
              data={currentData}
              keyExtractor={(row) => row.purchaseOrderId}
              emptyMessage={t('receiving.empty')}
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
