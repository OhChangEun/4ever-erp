'use client';

import { useEffect, useState } from 'react';
import InventoryMoveModal from './InventoryMoveModal';
import InventorySafetyModal from './InventorySafetyStockModal';
import {
  InventoryDetailModalProps,
  InventoryDetailResponse,
} from '../../types/InventoryDetailModalType';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getInventoryDetail, postStockMovement } from '../../inventory.api';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import StatusLabel from '@/app/components/common/StatusLabel';
import { FormatDate, getMovementColor, getMovementIcon } from '../../inventory.utils';
import IconButton from '@/app/components/common/IconButton';

const InventoryDetailModal = ({ selectedItemId, setSelectedItemId }: InventoryDetailModalProps) => {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showSafetyStockModal, setShowSafetyStockModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState({
    itemId: '',
    itemName: '',
    itemNumber: '',
    warehouseId: '',
    warehouseName: '',
    warehouseNumber: '',
    safetyStock: 0,
    currentStock: 0,
    uomName: '',
  });

  const handleStockMove = (itemId: string) => {
    setSelectedItemId(itemId);
    setSelectedStock({
      itemId: inventoryDetailRes?.itemId || '',
      itemName: inventoryDetailRes?.itemName || '',
      itemNumber: inventoryDetailRes?.itemNumber || '',
      warehouseId: inventoryDetailRes?.warehouseId || '',
      warehouseName: inventoryDetailRes?.warehouseName || '',
      warehouseNumber: inventoryDetailRes?.warehouseNumber || '',
      safetyStock: inventoryDetailRes?.safetyStock || 0,
      currentStock: inventoryDetailRes?.currentStock || 0,
      uomName: inventoryDetailRes?.uomName || '',
    });
    setShowMoveModal(true);
  };

  const handleSafetyStockEdit = () => {
    setSelectedStock({
      itemId: inventoryDetailRes?.itemId || '',
      itemName: inventoryDetailRes?.itemName || '',
      itemNumber: inventoryDetailRes?.itemNumber || '',
      warehouseId: inventoryDetailRes?.warehouseId || '',
      warehouseName: inventoryDetailRes?.warehouseName || '',
      warehouseNumber: inventoryDetailRes?.warehouseNumber || '',
      safetyStock: inventoryDetailRes?.safetyStock || 0,
      currentStock: inventoryDetailRes?.currentStock || 0,
      uomName: inventoryDetailRes?.uomName || '',
    });
    setShowSafetyStockModal(true);
  };

  const {
    data: inventoryDetailRes,
    isLoading,
    isError,
  } = useQuery<InventoryDetailResponse>({
    queryKey: ['inventoryDetail', selectedItemId],
    queryFn: () => getInventoryDetail(selectedItemId),
    enabled: !!selectedItemId,
  });
  const [errorModal, setErrorModal] = useState(false);
  useEffect(() => {
    setErrorModal(isError);
  }, [isError]);

  if (isLoading)
    return <ModalStatusBox type="loading" message="재고 상세 데이터를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        type="error"
        message="재고 상세 데이터를 불러오는 중 오류가 발생했습니다."
        onClose={() => setErrorModal(false)}
      />
    );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 정보 */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">기본 정보</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">품목명:</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.itemName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">품목코드:</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.itemNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">카테고리:</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">공급업체:</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.supplierCompanyName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">상태:</span>
                <StatusLabel statusCode={inventoryDetailRes?.statusCode || ''} />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">재고 정보</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">현재 재고:</span>
                <span className="text-sm font-medium text-blue-600">
                  {inventoryDetailRes?.currentStock} {inventoryDetailRes?.uomName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">안전 재고:</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.safetyStock} {inventoryDetailRes?.uomName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">단가:</span>
                <span className="text-sm font-medium text-gray-900">
                  ₩{inventoryDetailRes?.unitPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">총 가치:</span>
                <span className="text-sm font-medium text-green-600">
                  ₩{inventoryDetailRes?.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">위치 정보</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">창고:</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.warehouseName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">위치:</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.location}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">최종 수정:</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.lastModified?.slice(0, 10) ?? ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 재고 이동 기록 */}
        <div>
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">재고 이동 기록</h4>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {inventoryDetailRes?.stockMovement.map((movement) => (
                  <div
                    key={movement.referenceNumber}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${getMovementColor(movement.type)}`}
                    >
                      <i className={`${getMovementIcon(movement.type)} text-sm`}></i>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusLabel statusCode={movement.type} />
                        <span className="text-sm font-medium text-gray-900">
                          {movement.quantity} {movement.uomName}
                        </span>
                      </div>

                      {movement.type === '이동' && (
                        <div className="text-sm text-gray-600 mb-1">
                          {movement.from} → {movement.to}
                        </div>
                      )}

                      {movement.type === '입고' && (
                        <div className="text-sm text-gray-600 mb-1">→ {movement.to}</div>
                      )}

                      {movement.type === '출고' && (
                        <div className="text-sm text-gray-600 mb-1">{movement.from} →</div>
                      )}

                      <div className="text-xs text-gray-500">
                        {FormatDate(movement.movementDate)}· {movement.managerName}
                      </div>
                      <div className="text-xs text-blue-600">
                        {movement.referenceNumber} · {movement.note}
                      </div>
                      {/* {movement.note && ( */}
                      <div className="text-xs text-gray-500 mt-1">{movement.note}</div>
                      {/* )} */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-2 ">
            <IconButton
              variant="green"
              icon="ri-arrow-left-right-line"
              label="재고 이동"
              onClick={() => {
                //   setShowDetailModal(false);
                handleStockMove(inventoryDetailRes?.itemId ?? '');
              }}
              className="w-[49%]"
            />
            <IconButton
              icon="ri-edit-line mr-1"
              label="안전 재고 수정"
              onClick={() => {
                // setShowDetailModal(false);
                handleSafetyStockEdit();
              }}
              className="w-[51%]"
            />
          </div>
        </div>
      </div>
      {/* 재고 이동 모달 */}
      {showMoveModal && (
        <InventoryMoveModal setShowMoveModal={setShowMoveModal} selectedStock={selectedStock} />
      )}
      {/* 안전재고 수정 모달 */}
      {showSafetyStockModal && (
        <InventorySafetyModal
          setShowSafetyStockModal={setShowSafetyStockModal}
          selectedStock={selectedStock}
        />
      )}
    </>
  );
};

export default InventoryDetailModal;
