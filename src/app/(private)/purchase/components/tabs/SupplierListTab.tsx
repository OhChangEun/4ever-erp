'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SupplierFormModal from '@/app/(private)/purchase/components/modals/SupplierFormModal';
import SupplierDetailModal from '@/app/(private)/purchase/components/modals/SupplierDetailModal';
import {
  SupplierListRequestParams,
  SupplierListResponse,
} from '@/app/(private)/purchase/types/SupplierType';
import IconButton from '@/app/components/common/IconButton';
import {
  fetchSupplierCategoryDropdown,
  fetchSupplierList,
  fetchSupplierSearchTypeDropdown,
  fetchSupplierStatusDropdown,
} from '@/app/(private)/purchase/api/purchase.api';
import Dropdown from '@/app/components/common/Dropdown';
import Pagination from '@/app/components/common/Pagination';
import { useModal } from '@/app/components/common/modal/useModal';
import { useDropdown } from '@/app/hooks/useDropdown';
import StatusLabel from '@/app/components/common/StatusLabel';
import Table, { TableColumn } from '@/app/components/common/Table';

export default function SupplierListTab() {
  const { openModal } = useModal();

  // 공급업체 카테고리 드롭다운
  const { options: supplierCategoryOptions } = useDropdown(
    'supplierCategoryDropdown',
    fetchSupplierCategoryDropdown,
  );
  // 공급업체 상태 드롭다운
  const { options: supplierStatusOptions } = useDropdown(
    'supplierStatusDropdown',
    fetchSupplierStatusDropdown,
  );
  // 공급업체 검색타입 드롭다운
  const { options: supplierSearchTypeOptions } = useDropdown(
    'supplierSearchTypeDropdown',
    fetchSupplierSearchTypeDropdown,
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSearchType, setSelectedSearchType] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const queryParams = useMemo(
    (): SupplierListRequestParams => ({
      category: selectedCategory,
      statusCode: selectedStatus,
      type: selectedSearchType,
      keyword: keyword,
      page: currentPage - 1,
      size: pageSize,
    }),
    [selectedCategory, selectedStatus, selectedSearchType, keyword, currentPage],
  );

  // React Query로 데이터 가져오기 - 쿼리 파라미터 전달
  const {
    data: supplierData,
    isLoading,
    isError,
  } = useQuery<SupplierListResponse>({
    queryKey: ['supplierList', queryParams],
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

  type SupplierItem = (typeof suppliers)[0];
  const columns: TableColumn<SupplierItem>[] = [
    {
      key: 'supplierNumber',
      label: '공급업체 코드',
      align: 'center',
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
      align: 'center',
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
      align: 'center',
      render: (_, item) => `${item.supplierInfo.deliveryLeadTime}일`,
    },
    {
      key: 'statusCode',
      label: '상태',
      align: 'center',
      render: (_, item) => <StatusLabel $statusCode={item.supplierInfo.supplierStatusCode} />,
    },
    {
      key: 'action',
      label: '작업',
      align: 'center',
      render: (_, item) => (
        <button
          onClick={() => handleViewDetail(item.supplierInfo.supplierId)}
          className="w-8 h-8 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded cursor-pointer"
          title="상세보기"
        >
          <i className="ri-eye-line"></i>
        </button>
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
          <IconButton label="공급업체 등록" icon="ri-add-line" onClick={handleViewAddSupplier} />
        </div>
      </div>

      <Table
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
