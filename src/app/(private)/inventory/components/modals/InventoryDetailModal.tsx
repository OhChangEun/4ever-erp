'use client';

import { useState } from 'react';
import InventoryMoveModal from './InventoryMoveModal';
import InventorySafetyModal from './InventorySafetyStockModal';
import {
  type InventoryDetailModalProps,
  type InventoryDetailResponse,
} from '../../types/InventoryDetailModalType';
import { useQuery } from '@tanstack/react-query';
import { getInventoryDetail } from '../../inventory.api';
import { ModalStatusBox } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import {
  FormatDate,
  getMovementColor,
  getMovementIcon,
  MOVEMENT_TYPE,
} from '../../inventory.utils';
import { inventoryKeys } from '@/app/(private)/inventory/inventory.keys';

import { formatCurrency } from '@/app/utils/number';
import { Button } from '@everp/ui';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
import StockTrend from '../StockTrend';
import { useTranslations } from 'next-intl';
const InventoryDetailModal = ({ selectedItemId }: InventoryDetailModalProps) => {
  const t = useTranslations('inventory');
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

  const handleStockMove = () => {
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
    queryKey: inventoryKeys.detail(selectedItemId),
    queryFn: () => getInventoryDetail(selectedItemId),
    enabled: !!selectedItemId,
  });
  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading) return <ModalStatusBox type="loading" message={t('detail.loading')} />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox
        type="error"
        message={t('detail.loadError')}
        onClose={() => errorDialog.dismiss()}
      />
    );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 정보 */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">{t('detail.basicInfo')}</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.itemName')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.itemName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.itemNumber')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.itemNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.category')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.supplier')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.supplierCompanyName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.status')}</span>
                <StatusLabel statusCode={inventoryDetailRes?.statusCode || ''} />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">{t('detail.stockInfo')}</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.currentStock')}</span>
                <span className="text-sm font-medium text-blue-600">
                  {inventoryDetailRes?.currentStock} {inventoryDetailRes?.uomName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.safetyStock')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.safetyStock} {inventoryDetailRes?.uomName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.unitPrice')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(inventoryDetailRes?.unitPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.totalValue')}</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(inventoryDetailRes?.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">{t('detail.locationInfo')}</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.warehouse')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.warehouseName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.location')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.location}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.lastModified')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {inventoryDetailRes?.lastModified.slice(0, 10) ?? ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 재고 추이(시각화 2). 이동 기록을 읽기 전에 흐름을 한눈에 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <StockTrend itemId={selectedItemId} />
        </div>

        {/* 재고 이동 기록 */}
        <div>
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">{t('detail.movementHistory')}</h4>
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

                      {movement.type === MOVEMENT_TYPE.MOVE && (
                        <div className="text-sm text-gray-600 mb-1">
                          {movement.from} → {movement.to}
                        </div>
                      )}

                      {movement.type === MOVEMENT_TYPE.IN && (
                        <div className="text-sm text-gray-600 mb-1">→ {movement.to}</div>
                      )}

                      {movement.type === MOVEMENT_TYPE.OUT && (
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
            <Button
              variant="secondary"
              label={t('detail.moveStock')}
              onClick={() => {
                handleStockMove();
              }}
              className="w-[49%]"
            />
            <Button
              label={t('detail.editSafetyStock')}
              onClick={() => {
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
