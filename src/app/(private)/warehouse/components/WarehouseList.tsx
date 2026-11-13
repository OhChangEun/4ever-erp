'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInventoryLabels } from '@/app/(private)/inventory';
import dynamic from 'next/dynamic';
import { Pagination } from '@everp/ui';
import { getWarehouseList } from '../warehouse.api';
import StatusLabel from '@/app/components/common/StatusLabel';
import AddWarehouseModal from './modals/AddWarehouseModal';
import WarehouseDetailModal from './modals/WarehouseDetailModal';
import { useRole } from '@/app/hooks/useRole';
import { hasRole, IM_GATEWAY_ROLES } from '@/lib/authz/policy';
import ManageWarehouseModal from './modals/ManageWarehouseModal';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { useModal } from '@/app/components/common/modal/useModal';
import { warehouseKeys } from '@/app/(private)/warehouse/warehouse.keys';

import { Button } from '@everp/ui';

/** 3D 청크를 받는 동안 보이는 글자. 모달 안에서 그려져 창고 메시지를 본다 */
function ViewerLoading() {
  const t = useTranslations('warehouse.list');
  return (
    <div role="status" className="flex h-96 items-center justify-center text-sm text-gray-500">
      {t('viewerLoading')}
    </div>
  );
}

// three.js 는 3D 보기를 누를 때만 받는다. 틀은 공통 모달이라 Esc, 포커스 가두기, 포커스 되돌리기가 된다
const Warehouse3DModal = dynamic(
  () => import('./warehouseVisualizer/components/Warehouse3DModal'),
  {
    ssr: false,
    loading: () => <ViewerLoading />,
  },
);

const WarehouseList = () => {
  const { warehouseTypeLabel } = useInventoryLabels();
  const t = useTranslations('warehouse.list');
  const { openModal } = useModal();
  // 창고 추가는 게이트웨이가 IM 과 ALL_ADMIN 만 받는다
  const canAdd = hasRole(IM_GATEWAY_ROLES, useRole());
  const [currentPage, setCurrentPage] = useState(1);

  const handleWarehouseDetail = (warehouseId: string, warehouseName: string) => {
    openModal(WarehouseDetailModal, {
      width: '900px',
      title: t('detailModalTitle'),
      handleWarehouseManage: handleWarehouseManage,
      selectedWarehouseId: warehouseId,
      selectedWarehouseName: warehouseName,
    });
  };

  const handleWarehouseManage = (warehouseId: string, warehouseName: string) => {
    openModal(ManageWarehouseModal, {
      width: '600px',
      title: t('manageModalTitle', { name: warehouseName }),
      selectedWarehouseId: warehouseId,
    });
  };

  const handleWarehouse3D = (warehouseId: string, warehouseName: string) => {
    openModal(Warehouse3DModal, {
      title: t('view3dModalTitle', { name: warehouseName }),
      width: '900px',
      warehouseId,
      warehouseName,
    });
  };

  const queryParams = useMemo(
    () => ({
      page: currentPage - 1,
      size: 10,
    }),
    [currentPage],
  );
  const {
    data: warehouseRes,
    isPlaceholderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: warehouseKeys.list(queryParams),
    placeholderData: keepPreviousData,
    queryFn: () => getWarehouseList(queryParams),
  });

  const warehouses = warehouseRes?.data ?? [];
  const pageInfo = warehouseRes?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6 mt-8">
      {/* 툴바. 탭이 없는 화면이라 제목을 툴바 왼쪽에 둔다(안전재고 화면과 같다) */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
        {canAdd && (
          <Button
            label={t('add')}
            onClick={() => {
              openModal(AddWarehouseModal, { width: '700px', title: t('addModalTitle') });
            }}
          />
        )}
      </div>
      {isLoading ? (
        <TableStatusBox type="loading" message={t('loading')} />
      ) : isError ? (
        <TableStatusBox type="error" message={t('loadError')} />
      ) : warehouses.length === 0 ? (
        <TableStatusBox type="empty" message={t('empty')} />
      ) : (
        <div
          aria-busy={isPlaceholderData || undefined}
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
        >
          {warehouses.map((warehouse) => (
            <div
              key={warehouse.warehouseId}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{warehouse.warehouseName}</h3>
                  <p className="text-sm text-gray-500">{warehouse.warehouseNumber}</p>
                </div>
                {<StatusLabel statusCode={warehouse.statusCode} />}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <i className="ri-building-line mr-2"></i>
                  {warehouseTypeLabel(warehouse.warehouseType)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <i className="ri-map-pin-line mr-2"></i>
                  {warehouse.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <i className="ri-user-line mr-2"></i>
                  {warehouse.manager}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <i className="ri-phone-line mr-2"></i>
                  <a
                    href={`tel:${warehouse.managerPhone}`}
                    className="hover:text-blue-600 cursor-pointer"
                  >
                    {warehouse.managerPhone}
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-gray-200 sm:flex-row">
                <Button
                  variant="secondary"
                  label={t('detail')}
                  onClick={() =>
                    handleWarehouseDetail(warehouse.warehouseId, warehouse.warehouseName)
                  }
                  className="w-[32%]"
                />
                <Button
                  variant="secondary"
                  label={t('view3d')}
                  onClick={() => handleWarehouse3D(warehouse.warehouseId, warehouse.warehouseName)}
                  className="w-[31%]"
                />
                <Button
                  label={t('manage')}
                  onClick={() =>
                    handleWarehouseManage(warehouse.warehouseId, warehouse.warehouseName)
                  }
                  className="w-[34%]"
                />
              </div>
            </div>
          ))}
        </div>
      )}
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
};

export default WarehouseList;
