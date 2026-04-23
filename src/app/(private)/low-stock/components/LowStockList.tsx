'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LowStockListQueryParams } from '../types/LowStockListType';
import StatusLabel from '@/app/components/common/StatusLabel';
import Pagination from '@/app/components/common/Pagination';
import { LOW_STOCK_STATUS_OPTIONS } from '../../inventory/inventory.constants';
import { getLowStockList } from '../lowStock.api';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import Table, { TableColumn } from '@/app/components/common/Table';
import Dropdown from '@/app/components/common/Dropdown';
import IconButton from '@/app/components/common/IconButton';
import { useModal } from '@/app/components/common/modal/useModal';
import { useToast } from '@/app/components/common/toast/useToast';
import InventoryPurchaseRequestModal from '../../inventory/components/modals/InventoryPurchaseRequestModal';

export default function LowStockList() {
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
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['lowStockList', queryParams],
    queryFn: ({ queryKey }) => getLowStockList(queryKey[1] as LowStockListQueryParams),
    staleTime: 1000,
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
  }, [selectedItems, lowStocks]);

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
      toast.warning('발주할 품목을 선택해주세요.');
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
      title: '발주 요청',
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
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          onChange={toggleSelectAll}
          checked={lowStocks.length > 0 && selectedItems.length === lowStocks.length}
        />
      ),
      render: (_, lowStock) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={selectedItems.includes(lowStock.itemId)}
          onChange={() => toggleSelectItem(lowStock.itemId)}
        />
      ),
    },
    {
      key: 'itemName',
      label: '품목',
      render: (_, lowStock) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{lowStock.itemName}</div>
          <div className="text-sm text-gray-500">{lowStock.itemNumber}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: '카테고리',
      render: (_, lowStock) => (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          <StatusLabel $statusCode={lowStock.category} />
        </span>
      ),
    },
    {
      key: 'currentStock',
      label: '현재재고',
      render: (_, lowStock) => (
        <span className="text-sm text-gray-900">
          {lowStock.currentStock.toLocaleString()} {lowStock.uomName}
        </span>
      ),
    },
    {
      key: 'safetyStock',
      label: '안전재고',
      render: (_, lowStock) => (
        <span className="text-sm text-gray-500">
          {lowStock.safetyStock.toLocaleString()} {lowStock.uomName}
        </span>
      ),
    },
    {
      key: 'unitPrice',
      label: '단가',
      render: (_, lowStock) => `₩${lowStock.unitPrice.toLocaleString()}`,
    },
    {
      key: 'totalAmount',
      label: '총 가치',
      render: (_, lowStock) => (
        <span className="text-sm font-medium text-gray-900">
          ₩{lowStock.totalAmount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'warehouseName',
      label: '창고 위치',
      render: (_, lowStock) => (
        <div>
          <div className="text-sm text-gray-900">{lowStock.warehouseName}</div>
          <div className="text-sm text-gray-500">{lowStock.warehouseNumber}</div>
        </div>
      ),
    },
    {
      key: 'statusCode',
      label: '상태',
      render: (_, lowStock) => <StatusLabel $statusCode={lowStock.statusCode} />,
    },
  ];

  return (
    <div className="">
      <Link
        href="/inventory"
        className="px-3 text-sm text-gray-600 hover:text-gray-800 cursor-pointer flex items-center justify-end my-5"
      >
        <i className="ri-arrow-left-line mr-1"></i>
        재고관리로 돌아가기
      </Link>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">주의 재고 부족</h2>
            <div className="flex items-center space-x-4">
              <Dropdown
                placeholder="전체 상태"
                items={LOW_STOCK_STATUS_OPTIONS}
                value={statusFilter}
                onChange={(status: string) => setStatusFilter(status)}
                autoSelectFirst
              />

              <IconButton
                icon="ri-shopping-cart-line mr-1"
                label={`선택 품목 발주`}
                onClick={handleBulkOrder}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <TableStatusBox $type="loading" $message="재고 부족 목록을 불러오는 중입니다..." />
          ) : isError ? (
            <TableStatusBox
              $type="error"
              $message="재고 부족 목록을 불러오는 중 오류가 발생했습니다."
            />
          ) : (
            <Table
              columns={columns}
              data={lowStocks}
              keyExtractor={(row) => row.itemId}
              emptyMessage="부족한 재고가 없습니다."
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
