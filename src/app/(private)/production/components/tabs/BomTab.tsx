'use client';

import IconButton from '@/app/components/common/IconButton';
import { BomListResponse } from '@/app/(private)/production/types/BomListApiType';
import BomDetailModal from '@/app/(private)/production/components/modals/BomDetailModal';
// import BomInputFormModal from '@/app/(private)/production/components/modals/BomInputFormModal';
import { useQuery } from '@tanstack/react-query';
import { fetchBomList } from '../../api/production.api';
import { useModal } from '@/app/components/common/modal/useModal';
import BomInputFormModal from '../modals/BomInputFormModal';
import Pagination from '@/app/components/common/Pagination';
import { useMemo, useState } from 'react';
import { PageRequest } from '@/app/types/Page';
import Button from '@/app/components/common/Button';
import Input from '@/app/components/common/Input';
import StatusLabel from '@/app/components/common/StatusLabel';
import { formatDateTime } from '@/app/utils/date';
import Table, { TableColumn } from '@/app/components/common/Table';

export default function BomTab() {
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
    isLoading,
    isError,
  } = useQuery<BomListResponse>({
    queryKey: ['bomList', bomQueryParams],
    queryFn: () => fetchBomList(bomQueryParams),
  });

  // content 배열 추출
  const bomList = bomResponse?.content || [];
  const pageInfo = bomResponse?.page;

  const handleCreate = () => {
    openModal(BomInputFormModal, { title: 'BOM 생성', width: '1200px', height: '800px' });
  };

  const handleViewDetail = (bomId: string) => {
    openModal(BomDetailModal, {
      title: 'BOM 상세 정보',
      bomId: bomId,
      width: '800px',
      height: '700px',
    });
  };

  type BomItem = BomListResponse['content'][0];

  const columns: TableColumn<BomItem>[] = [
    {
      key: 'productName',
      label: '제품 정보',
      render: (_, bom) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{bom.productName}</div>
          <div className="text-sm text-gray-500">{bom.productNumber}</div>
        </div>
      ),
    },
    { key: 'bomNumber', label: 'BOM 번호' },
    { key: 'version', label: '버전' },
    {
      key: 'statusCode',
      label: '상태',
      align: 'center',
      render: (_, bom) => <StatusLabel $statusCode={bom.statusCode} />,
    },
    {
      key: 'lastModifiedAt',
      label: '최종 수정일',
      render: (_, bom) => formatDateTime(bom.lastModifiedAt),
    },
    {
      key: 'action',
      label: '작업',
      align: 'center',
      render: (_, bom) => (
        <Button
          label="상세보기"
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
        <IconButton label="BOM 생성" icon="ri-add-line" onClick={handleCreate} />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <i className="ri-loader-4-line animate-spin text-3xl text-gray-400"></i>
          <p className="mt-3 text-gray-500">로딩 중...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <i className="ri-error-warning-line text-3xl text-red-400"></i>
          <p className="mt-3 text-red-500">데이터를 불러오는데 실패했습니다.</p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={bomList}
          keyExtractor={(row) => row.bomId}
          emptyMessage="등록된 BOM이 없습니다."
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
