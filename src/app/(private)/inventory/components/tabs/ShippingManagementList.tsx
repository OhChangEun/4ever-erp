'use client';

import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getProductionList, getReadyToShipList } from '../../inventory.api';
import {
  type ProductionListResponse,
  type ReadyToShipListResponse,
} from '../../types/ShippingManagementListType';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Pagination } from '@everp/ui';
import ShippingDetailModal from '../modals/ShippingDetailModal';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { useModal } from '@/app/components/common/modal/useModal';
import { Table } from '@everp/ui';
import { shippingKeys } from '@/app/(private)/inventory/inventory.keys';
import { formatCurrency } from '@/app/utils/number';
import { Button } from '@everp/ui';
const ShippingManagementList = () => {
  const { openModal } = useModal();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubTab, setSelectedSubTab] = useState('producing');

  const queryParams = useMemo(
    () => ({
      page: currentPage - 1,
      size: 10,
    }),
    [currentPage],
  );
  const {
    data: ProductionRes,
    isPlaceholderData: isProductionPlaceholder,
    isLoading: isProductionLoading,
    isError: isProductionError,
  } = useQuery({
    queryKey: shippingKeys.productionList(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => getProductionList(queryParams),
  });

  const {
    data: ReadyToShipRes,
    isPlaceholderData: isReadyPlaceholder,
    isLoading: isReadyLoading,
    isError: isReadyError,
  } = useQuery({
    queryKey: shippingKeys.readyToShipList(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => getReadyToShipList(queryParams),
  });

  const isCurrentLoading = selectedSubTab === 'producing' ? isProductionLoading : isReadyLoading;
  const isCurrentError = selectedSubTab === 'producing' ? isProductionError : isReadyError;
  const currentRes = selectedSubTab === 'producing' ? ProductionRes : ReadyToShipRes;

  const currentData: (ProductionListResponse | ReadyToShipListResponse)[] = currentRes?.data ?? [];
  const pageInfo = currentRes?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  const shippingStatusTabs = [
    { id: 'producing', name: '생산중', count: ProductionRes?.pageData.totalElements },
    { id: 'readyToShip', name: '출고 준비 완료', count: ReadyToShipRes?.pageData.totalElements },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">출고 관리</h2>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 p-6 overflow-hidden">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6 shrink-0">
          {shippingStatusTabs.map((tab) => (
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
          {isProductionLoading || isReadyLoading ? (
            <TableStatusBox type="loading" message="출고 목록을 불러오는 중입니다..." />
          ) : isProductionError || isReadyError ? (
            <TableStatusBox type="error" message="출고 목록을 불러오는 중 오류가 발생했습니다." />
          ) : (
            <Table
              isStale={
                selectedSubTab === 'producing' ? isProductionPlaceholder : isReadyPlaceholder
              }
              columns={[
                { key: 'salesOrderNumber', label: '주문번호' },
                { key: 'customerName', label: '고객사' },
                {
                  key: 'orderDate',
                  label: '주문일',
                  render: (_, row) => row.orderDate.slice(0, 10),
                },
                {
                  key: 'dueDate',
                  label: '납기일',
                  render: (_, row) => row.dueDate.slice(0, 10),
                },
                {
                  key: 'totalAmount',
                  label: '총금액',
                  align: 'right',
                  render: (_, row) => formatCurrency(row.totalAmount),
                },
                {
                  key: 'statusCode',
                  label: '상태',
                  render: (_, row) => <StatusLabel statusCode={row.statusCode} />,
                },
                {
                  key: 'action',
                  label: '작업',
                  align: 'right',
                  render: (_, row) => (
                    <Button
                      label="상세"
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:bg-gray-100 px-2"
                      onClick={() => {
                        openModal(ShippingDetailModal, {
                          width: '900px',
                          title: `주문 상세 - ${row.salesOrderNumber}`,
                          selectedOrderId: row.salesOrderId,
                          selectedSubTab: selectedSubTab,
                        });
                      }}
                    />
                  ),
                },
              ]}
              data={currentData}
              keyExtractor={(row) => row.salesOrderId}
              emptyMessage="등록된 출고 정보가 없습니다."
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

export default ShippingManagementList;
