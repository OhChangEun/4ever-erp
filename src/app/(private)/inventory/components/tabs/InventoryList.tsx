'use client';

import { useMemo, useState } from 'react';
import {
  INVENTORY_SEARCH_KEYWORD_OPTIONS,
  INVENTORY_STATUS_OPTIONS,
  INVENTORY_TABLE_HEADERS,
} from '../../inventory.constants';
import Pagination from '@/app/components/common/Pagination';
import { useDebounce } from 'use-debounce';
import { useQuery } from '@tanstack/react-query';
import { InventoryResponse } from '../../types/InventoryListType';
import { getInventoryList } from '../../inventory.api';
import StatusLabel from '@/app/components/common/StatusLabel';
import InventoryDetailModal from '../modals/InventoryDetailModal';
import LowStockAlert from '../LowStockAlert';
import StockMovement from '../StockMovement';
import AddInventoryModal from '../modals/AddInventoryModal';
import Link from 'next/link';
import { Page } from '@/app/types/Page';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import Button from '@/app/components/common/Button';
import IconButton from '@/app/components/common/IconButton';
import Dropdown from '@/app/components/common/Dropdown';
import SearchBar from '@/app/components/common/SearchBar';
import { useModal } from '@/app/components/common/modal/useModal';
import InventoryPurchaseRequestModal from '../modals/InventoryPurchaseRequestModal';
import Table, { TableColumn } from '@/app/components/common/Table';
import { inventoryKeys } from '@/app/(private)/inventory/inventory.keys';

const InventoryList = () => {
  const { openModal } = useModal();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchType, setSearchType] = useState('warehouse');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const handleItemDetail = (itemId: string) => {
    setSelectedItemId(itemId);
    openModal(InventoryDetailModal, {
      title: '재고 이동 기록',
      width: '1000px',
      height: '1600px',
      selectedItemId: itemId,
      setSelectedItemId: setSelectedItemId,
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
    isLoading,
    isError,
  } = useQuery<{
    data: InventoryResponse[];
    pageData: Page;
  }>({
    queryKey: inventoryKeys.list(queryParams),
    queryFn: () => getInventoryList(queryParams),
    staleTime: 1000,
  });

  const inventories = InventoryRes?.data || [];
  const pageInfo = InventoryRes?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  type InventoryItem = (typeof inventories)[0];
  const columns: TableColumn<InventoryItem>[] = [
    {
      key: 'itemName',
      label: '품목',
      render: (_, inv) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{inv.itemName}</div>
          <div className="text-sm text-gray-500">{inv.itemNumber}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: '카테고리',
      render: (_, inv) => (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          {inv.category}
        </span>
      ),
    },
    {
      key: 'currentStock',
      label: '현재재고',
      align: 'right',
      render: (_, inv) => `${inv.currentStock.toLocaleString()} ${inv.uomName}`,
    },
    {
      key: 'forShipmentStock',
      label: '출고예정',
      align: 'right',
      render: (_, inv) => `${inv.forShipmentStock.toLocaleString()} ${inv.uomName}`,
    },
    {
      key: 'reservedStock',
      label: '예약재고',
      align: 'right',
      render: (_, inv) => `${inv.reservedStock.toLocaleString()} ${inv.uomName}`,
    },
    {
      key: 'safetyStock',
      label: '안전재고',
      align: 'right',
      render: (_, inv) => `${inv.safetyStock.toLocaleString()} ${inv.uomName}`,
    },
    {
      key: 'unitPrice',
      label: '단가',
      align: 'right',
      render: (_, inv) => `₩${inv.unitPrice.toLocaleString()}`,
    },
    {
      key: 'totalAmount',
      label: '재고가치',
      align: 'right',
      render: (_, inv) => `₩${inv.totalAmount.toLocaleString()}`,
    },
    {
      key: 'warehouseName',
      label: '창고',
      render: (_, inv) => (
        <div>
          <div className="text-sm text-gray-900">{inv.warehouseName}</div>
          <div className="text-sm text-gray-500">{inv.warehouseType}</div>
        </div>
      ),
    },
    {
      key: 'statusCode',
      label: '상태',
      align: 'center',
      render: (_, inv) => <StatusLabel statusCode={inv.statusCode} />,
    },
    {
      key: 'action',
      label: '작업',
      align: 'center',
      render: (_, inv) => (
        <button
          onClick={() => handleItemDetail(inv.itemId)}
          className="text-blue-600 hover:text-blue-900 cursor-pointer"
        >
          <i className="ri-eye-line"></i>
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
        <LowStockAlert />
        <StockMovement />
      </div>
      <div className="flex flex-col flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">재고 목록</h2>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Dropdown
                  placeholder="전체 상태"
                  items={INVENTORY_STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(status: string) => setStatusFilter(status)}
                  autoSelectFirst
                />
                <SearchBar
                  options={INVENTORY_SEARCH_KEYWORD_OPTIONS}
                  onTypeChange={(type: string) => setSearchType(type)}
                  onKeywordSearch={(keyword) => {
                    setSearchTerm(keyword);
                    setCurrentPage(1);
                  }}
                  placeholder="검색어를 입력하세요"
                />

                <Link href="/warehouse">
                  <Button label="창고 관리" variant="soft" />
                </Link>
                <IconButton
                  icon="ri-add-line mr-1"
                  label="원자재 추가"
                  onClick={() => {
                    openModal(AddInventoryModal, { title: '원자재 추가', width: '700px' });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        {isLoading ? (
          <TableStatusBox type="loading" message="재고 목록을 불러오는 중입니다..." />
        ) : isError ? (
          <TableStatusBox type="error" message="재고 목록을 불러오는 중 오류가 발생했습니다." />
        ) : (
          <Table
            columns={columns}
            data={inventories}
            keyExtractor={(row) => row.itemId}
            emptyMessage="등록된 재고가 없습니다."
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
