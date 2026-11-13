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
import { useTranslations } from 'next-intl';
import { Button, TabButtons } from '@everp/ui';
const ShippingManagementList = () => {
  const t = useTranslations('inventory');
  const tNav = useTranslations('nav');
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
    {
      id: 'producing',
      // 건수는 받기 전이면 빈 괄호(예전 글자 그대로)
      name: `${t('shipping.subTabs.producing')} (${ProductionRes?.pageData.totalElements ?? ''})`,
    },
    {
      id: 'readyToShip',
      name: `${t('shipping.subTabs.readyToShip')} (${ReadyToShipRes?.pageData.totalElements ?? ''})`,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6 overflow-hidden">
      <div className="flex shrink-0">
        <TabButtons
          label={tNav('tabsLabel', { title: t('tabs.shipping') })}
          tabs={shippingStatusTabs}
          activeTab={selectedSubTab}
          onTabChange={(tabId) => {
            setSelectedSubTab(tabId);
            setCurrentPage(1);
          }}
        />
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {isProductionLoading || isReadyLoading ? (
          <TableStatusBox type="loading" message={t('shipping.loading')} />
        ) : isProductionError || isReadyError ? (
          <TableStatusBox type="error" message={t('shipping.loadError')} />
        ) : (
          <Table
            isStale={selectedSubTab === 'producing' ? isProductionPlaceholder : isReadyPlaceholder}
            columns={[
              { key: 'salesOrderNumber', label: t('shipping.columns.salesOrderNumber') },
              { key: 'customerName', label: t('shipping.columns.customerName') },
              {
                key: 'orderDate',
                label: t('shipping.columns.orderDate'),
                render: (_, row) => row.orderDate.slice(0, 10),
              },
              {
                key: 'dueDate',
                label: t('shipping.columns.dueDate'),
                render: (_, row) => row.dueDate.slice(0, 10),
              },
              {
                key: 'totalAmount',
                label: t('shipping.columns.totalAmount'),
                align: 'right',
                render: (_, row) => formatCurrency(row.totalAmount),
              },
              {
                key: 'statusCode',
                label: t('shipping.columns.statusCode'),
                render: (_, row) => <StatusLabel statusCode={row.statusCode} />,
              },
              {
                key: 'action',
                label: t('shipping.columns.action'),
                align: 'right',
                render: (_, row) => (
                  <Button
                    label={t('common.detail')}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:bg-gray-100 px-2"
                    onClick={() => {
                      openModal(ShippingDetailModal, {
                        width: '900px',
                        title: t('shipping.detailModalTitle', { number: row.salesOrderNumber }),
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
            emptyMessage={t('shipping.empty')}
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
  );
};

export default ShippingManagementList;
