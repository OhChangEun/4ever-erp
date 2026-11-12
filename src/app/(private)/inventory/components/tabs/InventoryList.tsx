'use client';

import { useMemo, useState } from 'react';
import {
  INVENTORY_SEARCH_KEYWORD_OPTIONS,
  INVENTORY_STATUS_OPTIONS,
} from '../../inventory.constants';
import { Pagination } from '@everp/ui';
import { useDebounce } from 'use-debounce';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { type InventoryResponse } from '../../types/InventoryListType';
import { getInventoryList } from '../../inventory.api';
import StatusLabel from '@/app/components/common/StatusLabel';
import InventoryDetailModal from '../modals/InventoryDetailModal';
import LowStockAlert from '../LowStockAlert';
import StockMovement from '../StockMovement';
import AddInventoryModal from '../modals/AddInventoryModal';
import Link from 'next/link';
import { type Page } from '@/app/types/Page';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Button } from '@everp/ui';
import { Dropdown } from '@everp/ui';
import { SearchBar } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import { Table, type TableColumn } from '@everp/ui';
import { inventoryKeys } from '@/app/(private)/inventory/inventory.keys';
import { useTranslations } from 'next-intl';
import { useInventoryLabels } from '../../inventory.labels';

import { formatCurrency, formatNumber } from '@/app/utils/number';
const InventoryList = () => {
  const t = useTranslations('inventory');
  const { hasCategoryLabel, categoryLabel, warehouseTypeLabel } = useInventoryLabels();
  const { openModal } = useModal();
  const [searchType, setSearchType] = useState('warehouse');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const handleItemDetail = (itemId: string) => {
    openModal(InventoryDetailModal, {
      title: t('list.detailModalTitle'),
      width: '1000px',
      height: '1600px',
      selectedItemId: itemId,
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 200);
  const queryParams = useMemo(
    () => ({
      page: currentPage - 1,
      size: 10,
      type: searchType || '',
      keyword: debouncedSearchTerm || '',
      statusCode: statusFilter || 'ALL',
    }),
    [currentPage, statusFilter, debouncedSearchTerm, searchType],
  );

  const {
    data: InventoryRes,
    isPlaceholderData,
    isLoading,
    isError,
  } = useQuery<{
    data: InventoryResponse[];
    pageData: Page;
  }>({
    queryKey: inventoryKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => getInventoryList(queryParams),
  });

  const inventories = InventoryRes?.data || [];
  const pageInfo = InventoryRes?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  type InventoryItem = (typeof inventories)[0];
  const columns: TableColumn<InventoryItem>[] = [
    {
      key: 'itemName',
      label: t('list.columns.itemName'),
      render: (_, inv) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{inv.itemName}</div>
          <div className="text-sm text-gray-500">{inv.itemNumber}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: t('list.columns.category'),
      // StatusLabel은 공통 status를 읽으므로 도메인 번역과 기존 회색 점을 직접 표시한다.
      render: (_, inv) =>
        hasCategoryLabel(inv.category) ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-gray-800">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-400" />
            {categoryLabel(inv.category)}
          </span>
        ) : (
          <span>{inv.category}</span>
        ),
    },
    {
      key: 'currentStock',
      label: t('list.columns.currentStock'),
      align: 'right',
      render: (_, inv) => `${formatNumber(inv.currentStock)} ${inv.uomName}`,
    },
    {
      key: 'forShipmentStock',
      label: t('list.columns.forShipmentStock'),
      align: 'right',
      render: (_, inv) => `${formatNumber(inv.forShipmentStock)} ${inv.uomName}`,
    },
    {
      key: 'reservedStock',
      label: t('list.columns.reservedStock'),
      align: 'right',
      render: (_, inv) => `${formatNumber(inv.reservedStock)} ${inv.uomName}`,
    },
    {
      key: 'safetyStock',
      label: t('list.columns.safetyStock'),
      align: 'right',
      render: (_, inv) => `${formatNumber(inv.safetyStock)} ${inv.uomName}`,
    },
    {
      key: 'unitPrice',
      label: t('list.columns.unitPrice'),
      align: 'right',
      render: (_, inv) => formatCurrency(inv.unitPrice),
    },
    {
      key: 'totalAmount',
      label: t('list.columns.totalAmount'),
      align: 'right',
      render: (_, inv) => formatCurrency(inv.totalAmount),
    },
    {
      key: 'warehouseName',
      label: t('list.columns.warehouseName'),
      render: (_, inv) => (
        <div>
          <div className="text-sm text-gray-900">{inv.warehouseName ?? '-'}</div>
          <div className="text-sm text-gray-500">{warehouseTypeLabel(inv.warehouseType)}</div>
        </div>
      ),
    },
    {
      key: 'statusCode',
      label: t('list.columns.statusCode'),
      render: (_, inv) => <StatusLabel statusCode={inv.statusCode} />,
    },
    {
      key: 'action',
      label: t('list.columns.action'),
      align: 'right',
      render: (_, inv) => (
        <Button
          label={t('common.detail')}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:bg-gray-100 px-2"
          onClick={() => handleItemDetail(inv.itemId)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
        <LowStockAlert />
        <StockMovement />
      </div>
      <div className="flex flex-col flex-1 min-h-0 gap-6 overflow-hidden">
        <div className="shrink-0">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Dropdown
                  placeholder={t('common.allStatuses')}
                  items={INVENTORY_STATUS_OPTIONS.map((code) => ({
                    key: code,
                    value: t(`list.statusFilter.${code}`),
                  }))}
                  value={statusFilter}
                  onChange={(status: string) => setStatusFilter(status)}
                  autoSelectFirst
                />
                <SearchBar
                  options={INVENTORY_SEARCH_KEYWORD_OPTIONS.map((code) => ({
                    key: code,
                    value: t(`list.searchType.${code}`),
                  }))}
                  onTypeChange={(type: string) => setSearchType(type)}
                  onKeywordSearch={(keyword) => {
                    setSearchTerm(keyword);
                    setCurrentPage(1);
                  }}
                  placeholder={t('list.searchPlaceholder')}
                />

                <Link href="/warehouse">
                  <Button label={t('list.warehouses')} variant="secondary" />
                </Link>
                <Button
                  label={t('list.addMaterial')}
                  onClick={() => {
                    openModal(AddInventoryModal, { title: t('list.addMaterial'), width: '700px' });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        {isLoading ? (
          <TableStatusBox type="loading" message={t('list.loading')} />
        ) : isError ? (
          <TableStatusBox type="error" message={t('list.loadError')} />
        ) : (
          <Table
            isStale={isPlaceholderData}
            columns={columns}
            data={inventories}
            keyExtractor={(row) => row.itemId}
            emptyMessage={t('list.empty')}
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
    </div>
  );
};

export default InventoryList;
