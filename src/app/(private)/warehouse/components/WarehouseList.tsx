'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { WarehouseListQueryParams } from '../types/WarehouseListType';
import Pagination from '@/app/components/common/Pagination';
import { getWarehouseList } from '../warehouse.api';
import StatusLabel from '@/app/components/common/StatusLabel';
import AddWarehouseModal from './modals/AddWarehouseModal';
import WarehouseDetailModal from './modals/WarehouseDetailModal';
import ManageWarehouseModal from './modals/ManageWarehouseModal';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import IconButton from '@/app/components/common/IconButton';
import { useModal } from '@/app/components/common/modal/useModal';

const Warehouse3DModal = dynamic(
  () => import('./warehouseVisualizer/components/Warehouse3DModal'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/40 text-white">
        3D 뷰어를 준비하는 중...
      </div>
    ),
  },
);

const WarehouseList = () => {
  const { openModal } = useModal();
  const [showManageModal, setShowManageModal] = useState(false);
  const [show3DModal, setShow3DModal] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedWarehouseName, setSelectedWarehouseName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleWarehouseDetail = (warehouseId: string, warehouseName: string) => {
    setSelectedWarehouseId(warehouseId);
    openModal(WarehouseDetailModal, {
      width: '900px',
      title: '창고 상세 정보',
      $handleWarehouseManage: handleWarehouseManage,
      $selectedWarehouseId: warehouseId,
      $selectedWarehouseName: warehouseName,
    });
  };

  const handleWarehouseManage = (warehouseId: string, warehouseName: string) => {
    setSelectedWarehouseId(warehouseId);
    openModal(ManageWarehouseModal, {
      width: '600px',
      title: `창고 관리 - ${warehouseName}`,
      $selectedWarehouseId: warehouseId,
    });
  };

  const handleWarehouse3D = (warehouseId: string, warehouseName: string) => {
    setSelectedWarehouseId(warehouseId);
    setSelectedWarehouseName(warehouseName);
    setShow3DModal(true);
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
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['warehouseList', queryParams],
    queryFn: ({ queryKey }) => getWarehouseList(queryKey[1] as WarehouseListQueryParams),
    staleTime: 1000,
  });

  const warehouses = warehouseRes?.data ?? [];
  const pageInfo = warehouseRes?.pageData;
  const totalPages = pageInfo?.totalPages ?? 1;

  return (
    <div className="bg-white rounded-lg  border border-gray-200 mt-8">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">창고 목록</h2>
          <IconButton
            icon="ri-add-line mr-1"
            label="창고 추가"
            onClick={() => {
              openModal(AddWarehouseModal, { width: '700px', title: '새 창고 추가' });
            }}
          />
        </div>
      </div>
      {isLoading ? (
        <TableStatusBox $type="loading" $message="창고 목록을 불러오는 중입니다..." />
      ) : isError ? (
        <TableStatusBox $type="error" $message="창고 목록을 불러오는 중 오류가 발생했습니다." />
      ) : !warehouses || warehouses.length === 0 ? (
        <TableStatusBox $type="empty" $message="등록된 창고가 없습니다." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {warehouses.map((warehouse) => (
            <div
              key={warehouse.warehouseId}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{warehouse.warehouseName}</h3>
                  <p className="text-sm text-gray-500">{warehouse.warehouseNumber}</p>
                </div>
                {<StatusLabel $statusCode={warehouse.statusCode} />}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <i className="ri-building-line mr-2"></i>
                  {warehouse.warehouseType}
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
                <IconButton
                  variant="outline"
                  label="상세보기"
                  icon="ri-eye-line"
                  onClick={() =>
                    handleWarehouseDetail(warehouse.warehouseId, warehouse.warehouseName)
                  }
                  className="w-[32%]"
                />
                <IconButton
                  variant="outline"
                  label="3D 보기"
                  icon="ri-box-3-line"
                  onClick={() => handleWarehouse3D(warehouse.warehouseId, warehouse.warehouseName)}
                  className="w-[31%]"
                />
                <IconButton
                  label="관리"
                  icon="ri-edit-line mr-1"
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

      {show3DModal && (
        <Warehouse3DModal
          warehouseId={selectedWarehouseId}
          warehouseName={selectedWarehouseName}
          onClose={() => setShow3DModal(false)}
        />
      )}
    </div>
  );
};

export default WarehouseList;
