'use client';

import { type BomListResponse } from '@/app/(private)/production/types/BomListApiType';
import BomDetailModal from '@/app/(private)/production/components/modals/BomDetailModal';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchBomList } from '../../api/production.api';
import { useModal } from '@/app/components/common/modal/useModal';
import BomInputFormModal from '../modals/BomInputFormModal';
import { Pagination } from '@everp/ui';
import { useMemo, useState } from 'react';
import { type PageRequest } from '@/app/types/Page';
import { Button } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { formatDateTime } from '@/app/utils/date';
import { Table, type TableColumn } from '@everp/ui';
import { bomKeys } from '@/app/(private)/production/api/production.keys';
import { useTranslations } from 'next-intl';

export default function BomTab() {
  const t = useTranslations('production');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { openModal } = useModal();

  const bomQueryParams = useMemo(
    (): PageRequest => ({
      page: currentPage - 1,
      size: pageSize,
    }),
    [currentPage, pageSize],
  );

  // bom 목록 조회
  const {
    data: bomResponse,
    isPlaceholderData: isPlaceholderData,
    isLoading,
    isError,
  } = useQuery<BomListResponse>({
    queryKey: bomKeys.list(bomQueryParams),
    placeholderData: keepPreviousData,
    queryFn: () => fetchBomList(bomQueryParams),
  });

  // content 배열 추출
  const bomList = bomResponse?.content || [];
  const pageInfo = bomResponse?.page;

  const handleCreate = () => {
    openModal(BomInputFormModal, { title: t('bom.create'), width: '1200px', height: '800px' });
  };

  const handleViewDetail = (bomId: string) => {
    openModal(BomDetailModal, {
      title: t('bom.detailTitle'),
      bomId: bomId,
      width: '800px',
      height: '700px',
    });
  };

  type BomItem = BomListResponse['content'][0];

  const columns: TableColumn<BomItem>[] = [
    {
      key: 'productName',
      label: t('bom.productInfo'),
      render: (_, bom) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{bom.productName}</div>
          <div className="text-sm text-gray-500">{bom.productNumber}</div>
        </div>
      ),
    },
    { key: 'bomNumber', label: t('common.bomNumber') },
    { key: 'version', label: t('common.version') },
    {
      key: 'statusCode',
      label: t('common.status'),
      render: (_, bom) => <StatusLabel statusCode={bom.statusCode} />,
    },
    {
      key: 'lastModifiedAt',
      label: t('common.lastModified'),
      render: (_, bom) => formatDateTime(bom.lastModifiedAt),
    },
    {
      key: 'action',
      label: t('bom.action'),
      align: 'right',
      render: (_, bom) => (
        <Button
          label={t('bom.viewDetail')}
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetail(bom.bomId)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-end shrink-0">
        <Button label={t('bom.create')} onClick={handleCreate} />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <i className="ri-loader-4-line animate-spin text-3xl text-gray-400"></i>
          <p className="mt-3 text-gray-500">{t('common.loading')}</p>
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <i className="ri-error-warning-line text-3xl text-red-400"></i>
          <p className="mt-3 text-red-500">{t('common.loadFailed')}</p>
        </div>
      ) : (
        <Table
          isStale={isPlaceholderData}
          columns={columns}
          data={bomList}
          keyExtractor={(row) => row.bomId}
          emptyMessage={t('bom.empty')}
          className="flex-1 min-h-0"
        />
      )}

      {isError || isLoading ? null : (
        <Pagination
          currentPage={currentPage}
          totalPages={pageInfo?.totalPages ?? 1}
          totalElements={pageInfo?.totalElements}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
}
