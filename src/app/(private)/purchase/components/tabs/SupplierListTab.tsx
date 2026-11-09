'use client';

import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import SupplierFormModal from '@/app/(private)/purchase/components/modals/SupplierFormModal';
import SupplierDetailModal from '@/app/(private)/purchase/components/modals/SupplierDetailModal';
import {
  SupplierListItem,
  SupplierListParams,
  SupplierListResponse,
} from '@/app/(private)/purchase/types/SupplierType';
import {
  fetchSupplierCategoryOptions,
  fetchSupplierList,
  fetchSupplierSearchTypeOptions,
  fetchSupplierStatusOptions,
} from '@/app/(private)/purchase/api/purchase.api';
import { Dropdown } from '@everp/ui';
import { Pagination } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Table, TableColumn } from '@everp/ui';
import { supplierKeys } from '@/app/(private)/purchase/api/purchase.keys';

import { Button } from '@everp/ui';
export default function SupplierListTab() {
  const { openModal } = useModal();

  // 공급업체 카테고리 드롭다운
  const { options: supplierCategoryOptions } = useDropdown(
    'supplierCategoryDropdown',
    fetchSupplierCategoryOptions,
  );
  // 공급업체 상태 드롭다운
  const { options: supplierStatusOptions } = useDropdown(
    'supplierStatusDropdown',
    fetchSupplierStatusOptions,
  );
  // 공급업체 검색타입 드롭다운
  const { options: supplierSearchTypeOptions } = useDropdown(
    'supplierSearchTypeDropdown',
    fetchSupplierSearchTypeOptions,
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSearchType, setSelectedSearchType] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const queryParams = useMemo(
    (): SupplierListParams => ({
      category: selectedCategory,
      statusCode: selectedStatus,
      type: selectedSearchType,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedCategory, selectedStatus, selectedSearchType, currentPage],
  );

  // React Query로 데이터 가져오기 - 쿼리 파라미터 전달
  const {
    data: supplierData,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery<SupplierListResponse>({
    queryKey: supplierKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchSupplierList(queryParams),
  });

  if (isLoading) return <p>불러오는 중...</p>;
  if (isError || !supplierData) return <p>데이터를 불러오지 못했습니다.</p>;

  const suppliers = supplierData.content || [];
  const pageInfo = supplierData.page;
  const totalPages = pageInfo?.totalPages ?? 1;

  const handleViewAddSupplier = () => {
    openModal(SupplierFormModal, { title: '공급업체 등록', height: '800px' });
  };

  const handleViewDetail = (supplierId: string) => {
    openModal(SupplierDetailModal, { title: '공급업체 상세', supplierId: supplierId });
  };

  const columns: TableColumn<SupplierListItem>[] = [
    {
      key: 'supplierNumber',
      label: '공급업체 코드',
      render: (_, item) => item.supplierInfo.supplierNumber,
    },
    {
      key: 'supplierName',
      label: '업체명',
      render: (_, item) => item.supplierInfo.supplierName,
    },
    {
      key: 'category',
      label: '카테고리',
      render: (_, item) => item.supplierInfo.category,
    },
    {
      key: 'contact',
      label: '연락처',
      render: (_, item) => (
        <div className="flex flex-col">
          <span>{item.supplierInfo.supplierEmail}</span>
          <span>{item.supplierInfo.supplierPhone}</span>
        </div>
      ),
    },
    {
      key: 'address',
      label: '주소',
      render: (_, item) => (
        <div className="flex flex-col">
          <span>{item.supplierInfo.supplierBaseAddress}</span>
          <span>{item.supplierInfo.supplierDetailAddress}</span>
        </div>
      ),
    },
    {
      key: 'deliveryLeadTime',
      label: '배송 기간',
      render: (_, item) => `${item.supplierInfo.deliveryLeadTime}일`,
    },
    {
      key: 'statusCode',
      label: '상태',
      render: (_, item) => <StatusLabel statusCode={item.supplierInfo.supplierStatusCode} />,
    },
    {
      key: 'action',
      label: '작업',
      align: 'right',
      render: (_, item) => (
        <Button
          label="상세"
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:bg-gray-100 px-2"
          onClick={() => handleViewDetail(item.supplierInfo.supplierId)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">공급업체 목록</h3>
        <div className="flex items-center space-x-4">
          {/* 공급업체 카테고리 드롭다운 */}
          <Dropdown
            placeholder="전체 카테고리"
            items={supplierCategoryOptions}
            value={selectedCategory}
            onChange={(category: string): void => {
              setSelectedCategory(category);
              setCurrentPage(1);
            }}
          />
          <Dropdown
            placeholder="전체 상태"
            items={supplierStatusOptions}
            value={selectedStatus}
            onChange={(status: string): void => {
              setSelectedStatus(status);
              setCurrentPage(1);
            }}
          />
          <Dropdown
            placeholder="검색 타입"
            items={supplierSearchTypeOptions}
            value={selectedSearchType}
            onChange={(type: string): void => {
              setSelectedSearchType(type);
              setCurrentPage(1);
            }}
          />
          <Button label="공급업체 등록" onClick={handleViewAddSupplier} />
        </div>
      </div>

      <Table
        isStale={isPlaceholderData}
        columns={columns}
        data={suppliers}
        keyExtractor={(row) => row.supplierInfo.supplierId}
        emptyMessage="공급업체가 없습니다."
        className="flex-1 min-h-0"
      />
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
  );
}
