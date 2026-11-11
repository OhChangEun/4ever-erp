'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Pagination } from '@everp/ui';
import { LOW_STOCK_STATUS_OPTIONS } from '@/app/(private)/inventory';
import { getLowStockList } from '../lowStock.api';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Table, type TableColumn } from '@everp/ui';
import { Dropdown } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import { useToast } from '@/app/components/common/toast/useToast';
import { lowStockKeys } from '@/app/(private)/low-stock/lowStock.keys';
import { useTranslations } from 'next-intl';

import { formatCurrency, formatNumber } from '@/app/utils/number';
import { Button } from '@everp/ui';
// 구매 요청 모달은 누를 때만 받는다. 재고 화면 공개 입구(ui.ts)에는 다른 모달도 있어
// 정적으로 가져오면 그것까지 첫 로드에 딸려 온다(시각화 8 뒤 /low-stock +5.0KB, CI 번들 표)
const InventoryPurchaseRequestModal = dynamic(() =>
  import('@/app/(private)/inventory/ui').then((m) => m.InventoryPurchaseRequestModal),
);

export default function LowStockList() {
  const t = useTranslations('lowStock.list');
  const { openModal } = useModal();
  const toast = useToast();
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const queryParams = useMemo(
    () => ({
      page: currentPage - 1,
      size: 10,
      statusCode: statusFilter || 'ALL',
    }),
    [currentPage, statusFilter],
  );

  const {
    data: lowStockRes,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: lowStockKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => getLowStockList(queryParams),
  });

  const lowStocks = lowStockRes?.data ?? [];
  const pageInfo = lowStockRes?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  // indeterminate 상태 업데이트
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate =
        selectedItems.length > 0 && selectedItems.length < lowStocks.length;
    }
  }, [selectedItems, lowStocks.length]);

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === lowStocks.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(lowStocks.map((item) => item.itemId));
    }
  };

  const handleBulkOrder = () => {
    if (selectedItems.length === 0) {
      toast.warning(t('selectRequired'));
      return;
    }

    // 선택된 아이템들의 데이터 추출
    const selectedItemsData = lowStocks
      .filter((item) => selectedItems.includes(item.itemId))
      .map((item) => ({
        itemId: item.itemId,
        itemNumber: item.itemNumber,
        itemName: item.itemName,
        unitPrice: item.unitPrice,
        safetyStock: item.safetyStock,
        currentStock: item.currentStock,
        uomName: item.uomName,
      }));

    openModal(InventoryPurchaseRequestModal, {
      title: t('purchaseModalTitle'),
      items: selectedItemsData,
      width: '600px',
      height: '400px',
    });
  };

  type LowStockItem = (typeof lowStocks)[0];

  const columns: TableColumn<LowStockItem>[] = [
    {
      key: 'select',
      label: '',
      headerRender: () => (
        <input
          ref={selectAllCheckboxRef}
          type="checkbox"
          aria-label={t('selectAll')}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          onChange={toggleSelectAll}
          checked={lowStocks.length > 0 && selectedItems.length === lowStocks.length}
        />
      ),
      render: (_, lowStock) => (
        <input
          type="checkbox"
          aria-label={t('selectItem', { name: lowStock.itemName })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={selectedItems.includes(lowStock.itemId)}
          onChange={() => toggleSelectItem(lowStock.itemId)}
        />
      ),
    },
    {
      key: 'itemName',
      label: t('columns.itemName'),
      render: (_, lowStock) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{lowStock.itemName}</div>
          <div className="text-sm text-gray-500">{lowStock.itemNumber}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: t('columns.category'),
      render: (_, lowStock) => (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          <StatusLabel statusCode={lowStock.category} />
        </span>
      ),
    },
    {
      key: 'currentStock',
      label: t('columns.currentStock'),
      render: (_, lowStock) => (
        <span className="text-sm text-gray-900">
          {formatNumber(lowStock.currentStock)} {lowStock.uomName}
        </span>
      ),
    },
    {
      key: 'safetyStock',
      label: t('columns.safetyStock'),
      render: (_, lowStock) => (
        <span className="text-sm text-gray-500">
          {formatNumber(lowStock.safetyStock)} {lowStock.uomName}
        </span>
      ),
    },
    {
      key: 'unitPrice',
      align: 'right',
      label: t('columns.unitPrice'),
      render: (_, lowStock) => formatCurrency(lowStock.unitPrice),
    },
    {
      key: 'totalAmount',
      label: t('columns.totalAmount'),
      render: (_, lowStock) => (
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(lowStock.totalAmount)}
        </span>
      ),
    },
    {
      key: 'warehouseName',
      label: t('columns.warehouseName'),
      render: (_, lowStock) => (
        <div>
          <div className="text-sm text-gray-900">{lowStock.warehouseName}</div>
          <div className="text-sm text-gray-500">{lowStock.warehouseNumber}</div>
        </div>
      ),
    },
    {
      key: 'statusCode',
      label: t('columns.statusCode'),
      render: (_, lowStock) => <StatusLabel statusCode={lowStock.statusCode} />,
    },
  ];

  return (
    <div className="">
      <Link
        href="/inventory"
        className="px-3 text-sm text-gray-600 hover:text-gray-800 cursor-pointer flex items-center justify-end my-5"
      >
        <i className="ri-arrow-left-line mr-1"></i>
        {t('back')}
      </Link>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
            <div className="flex items-center space-x-4">
              <Dropdown
                placeholder={t('allStatuses')}
                items={LOW_STOCK_STATUS_OPTIONS.map((code) => ({
                  key: code,
                  value: t(`statusFilter.${code}`),
                }))}
                value={statusFilter}
                onChange={(status: string) => setStatusFilter(status)}
                autoSelectFirst
              />

              <Button label={t('orderSelected')} onClick={handleBulkOrder} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <TableStatusBox type="loading" message={t('loading')} />
          ) : isError ? (
            <TableStatusBox type="error" message={t('loadError')} />
          ) : (
            <Table
              isStale={isPlaceholderData}
              columns={columns}
              data={lowStocks}
              keyExtractor={(row) => row.itemId}
              emptyMessage={t('empty')}
            />
          )}
        </div>
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
}
