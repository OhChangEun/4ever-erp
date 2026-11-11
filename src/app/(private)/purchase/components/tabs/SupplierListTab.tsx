'use client';

import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import SupplierFormModal from '@/app/(private)/purchase/components/modals/SupplierFormModal';
import SupplierDetailModal from '@/app/(private)/purchase/components/modals/SupplierDetailModal';
import {
  type SupplierListItem,
  type SupplierListParams,
  type SupplierListResponse,
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
import { Table, type TableColumn } from '@everp/ui';
import { supplierKeys } from '@/app/(private)/purchase/api/purchase.keys';

import { Button } from '@everp/ui';
import { useTranslations } from 'next-intl';
import { useRole } from '@/app/hooks/useRole';
import { hasRole, MM_GATEWAY_ROLES } from '@/lib/authz/policy';
import { useSupplierCategoryLabels } from '@/app/(private)/purchase/supplierCategory';

export default function SupplierListTab() {
  const { openModal } = useModal();
  const t = useTranslations('purchase.supplierList');
  const tc = useTranslations('purchase.common');
  // 공급업체 등록은 게이트웨이가 MM 과 ALL_ADMIN 만 받는다
  const canCreate = hasRole(MM_GATEWAY_ROLES, useRole());
  const { categoryLabel, categoryOptions } = useSupplierCategoryLabels();

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

  if (isLoading) return <p>{t('loading')}</p>;
  if (isError || !supplierData) return <p>{t('loadError')}</p>;

  const suppliers = supplierData.content;
  const pageInfo = supplierData.page;
  const totalPages = pageInfo.totalPages;

  const handleViewAddSupplier = () => {
    openModal(SupplierFormModal, { title: t('formModalTitle'), height: '800px' });
  };

  const handleViewDetail = (supplierId: string) => {
    openModal(SupplierDetailModal, { title: t('detailModalTitle'), supplierId: supplierId });
  };

  const columns: TableColumn<SupplierListItem>[] = [
    {
      key: 'supplierNumber',
      label: t('columns.number'),
      render: (_, item) => item.supplierInfo.supplierNumber,
    },
    {
      key: 'supplierName',
      label: t('columns.name'),
      render: (_, item) => item.supplierInfo.supplierName,
    },
    {
      key: 'category',
      label: t('columns.category'),
      render: (_, item) => categoryLabel(item.supplierInfo.category),
    },
    {
      key: 'contact',
      label: t('columns.contact'),
      render: (_, item) => (
        <div className="flex flex-col">
          <span>{item.supplierInfo.supplierEmail}</span>
          <span>{item.supplierInfo.supplierPhone}</span>
        </div>
      ),
    },
    {
      key: 'address',
      label: t('columns.address'),
      render: (_, item) => (
        <div className="flex flex-col">
          <span>{item.supplierInfo.supplierBaseAddress}</span>
          <span>{item.supplierInfo.supplierDetailAddress}</span>
        </div>
      ),
    },
    {
      key: 'deliveryLeadTime',
      label: t('columns.leadTime'),
      render: (_, item) => tc('days', { days: item.supplierInfo.deliveryLeadTime }),
    },
    {
      key: 'statusCode',
      label: t('columns.status'),
      render: (_, item) => <StatusLabel statusCode={item.supplierInfo.supplierStatusCode} />,
    },
    {
      key: 'action',
      label: t('columns.action'),
      align: 'right',
      render: (_, item) => (
        <Button
          label={tc('detail')}
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
        <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        <div className="flex items-center space-x-4">
          {/* 공급업체 카테고리 드롭다운 */}
          <Dropdown
            placeholder={t('allCategories')}
            items={categoryOptions(supplierCategoryOptions)}
            value={selectedCategory}
            onChange={(category: string): void => {
              setSelectedCategory(category);
              setCurrentPage(1);
            }}
          />
          <Dropdown
            placeholder={tc('allStatuses')}
            items={supplierStatusOptions}
            value={selectedStatus}
            onChange={(status: string): void => {
              setSelectedStatus(status);
              setCurrentPage(1);
            }}
          />
          <Dropdown
            placeholder={t('searchType')}
            items={supplierSearchTypeOptions}
            value={selectedSearchType}
            onChange={(type: string): void => {
              setSelectedSearchType(type);
              setCurrentPage(1);
            }}
          />
          {canCreate && <Button label={t('create')} onClick={handleViewAddSupplier} />}
        </div>
      </div>

      <Table
        isStale={isPlaceholderData}
        columns={columns}
        data={suppliers}
        keyExtractor={(row) => row.supplierInfo.supplierId}
        emptyMessage={t('empty')}
        className="flex-1 min-h-0"
      />
      {/* 페이지네이션 */}
      {/* 로딩과 오류는 위에서 먼저 끝난다(응답은 zod 로 검증됨) */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={pageInfo.totalElements}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}
