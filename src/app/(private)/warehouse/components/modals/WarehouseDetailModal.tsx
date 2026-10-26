'use client';

import { useQuery } from '@tanstack/react-query';
import {
  WarehouseDetailModalProps,
  WarehouseDetailResponse,
} from '../../types/WarehouseDetailModalType';
import { useEffect, useState } from 'react';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { getWarehouseDetail } from '../../warehouse.api';
import StatusLabel from '@/app/components/common/StatusLabel';
import { warehouseKeys } from '@/app/(private)/warehouse/warehouse.keys';

const WarehouseDetailModal = ({
  onClose,
  handleWarehouseManage,
  selectedWarehouseId,
  selectedWarehouseName,
}: WarehouseDetailModalProps) => {
  const {
    data: warehouseDetailRes,
    isLoading,
    isError,
  } = useQuery<WarehouseDetailResponse>({
    queryKey: warehouseKeys.detail(selectedWarehouseId),
    queryFn: () => getWarehouseDetail(selectedWarehouseId),
    enabled: !!selectedWarehouseId,
  });

  const warehouseInfo = warehouseDetailRes?.warehouseInfo;
  const managerInfo = warehouseDetailRes?.manager;

  const [errorModal, setErrorModal] = useState(false);
  useEffect(() => {
    setErrorModal(isError);
  }, [isError]);

  if (isLoading)
    return <ModalStatusBox type="loading" message="창고 상세 정보를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        type="error"
        message="창고 상세 정보를 불러오는 중 오류가 발생했습니다."
        onClose={() => setErrorModal(false)}
      />
    );
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">기본 정보</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">창고명:</span>
                <span className="text-sm font-medium text-gray-900">
                  {warehouseInfo?.warehouseName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">창고코드:</span>
                <span className="text-sm font-medium text-gray-900">
                  {warehouseInfo?.warehouseNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">창고 유형:</span>
                <span className="text-sm font-medium text-gray-900">
                  {warehouseInfo?.warehouseType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">상태:</span>
                {<StatusLabel statusCode={warehouseInfo?.statusCode as string} />}
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">위치 정보</h4>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600 block mb-1">주소:</span>
                <span className="text-sm text-gray-900">{warehouseInfo?.location}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">담당자 정보</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">담당자:</span>
              <span className="text-sm font-medium text-gray-900">{managerInfo?.managerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">연락처:</span>
              <span className="text-sm font-medium text-blue-600">
                {managerInfo?.managerPhoneNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">이메일:</span>
              <span className="text-sm font-medium text-blue-600">{managerInfo?.managerEmail}</span>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">설명</h4>
            <p className="text-sm text-gray-700">{warehouseInfo?.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => {
            // setShowDetailModal(false);
            handleWarehouseManage(selectedWarehouseId, selectedWarehouseName);
          }}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
        >
          <i className="ri-edit-line mr-1"></i>
          창고 관리
        </button>
      </div>
    </>
  );
};

export default WarehouseDetailModal;
