'use client';

import { useQuery } from '@tanstack/react-query';
import { getWarehouseInfo } from '../../inventory.api';
import { useMoveStock } from '../../inventory.mutations';
import { useMemo, useState, useId } from 'react';
import { type InventoryMoveModalProps } from '../../types/InventoryMoveModalType';
import {
  type WarehouseToggleQueryParams,
  type WarehouseToggleResponse,
} from '../../types/AddInventoryModalType';
import { ModalStatusBox } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { warehouseInfoKeys } from '@/app/(private)/inventory/inventory.keys';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
import { useTranslations } from 'next-intl';

const InventoryMoveModal = ({ setShowMoveModal, selectedStock }: InventoryMoveModalProps) => {
  const t = useTranslations('inventory');
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  const [formData, setFormData] = useState({
    fromWarehouseId: selectedStock.warehouseId,
    toWarehouseId: '',
    itemId: selectedStock.itemId,
    stockQuantity: 0,
    uomName: selectedStock.uomName,
    reason: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // 수량은 숫자로 보낸다. input 값은 문자열이라 그대로 두면 서버에 "30" 이 간다
    setFormData((prev) => ({ ...prev, [name]: name === 'stockQuantity' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    moveStock(formData);
  };

  // -----------------------------

  const queryParams = useMemo(() => {
    const params: WarehouseToggleQueryParams = {
      warehouseId: selectedStock.warehouseId,
    };
    return params;
  }, [selectedStock.warehouseId]);

  const {
    data: warehouseInfoRes,
    isLoading,
    isError,
  } = useQuery<WarehouseToggleResponse[]>({
    queryKey: warehouseInfoKeys.list(queryParams),
    queryFn: () => getWarehouseInfo(queryParams),
    enabled: !!selectedStock.itemId,
  });
  // 낙관적 업데이트(출발 창고 상세의 현재고)와 무효화는 inventory.mutations.ts 한 곳.
  const { mutate: moveStock, isPending: isMoving } = useMoveStock({
    onSuccess: () => {
      toast.success(t('move.success'));
      setShowMoveModal(false);
    },
    onError: (error) => toast.error(t('move.error', { message: errorMessageOf(error) })),
  });

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading) return <ModalStatusBox type="loading" message={t('move.loading')} />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox
        type="error"
        message={t('move.loadError')}
        onClose={() => errorDialog.dismiss()}
      />
    );
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-overlay">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('move.title')}</h3>
          <button
            onClick={() => setShowMoveModal(false)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-900">{selectedStock.itemName}</div>
          <div className="text-sm text-gray-500">{selectedStock.itemNumber}</div>
          <div className="text-sm text-gray-600 mt-1">
            {t('move.currentLocation', {
              name: selectedStock.warehouseName,
              number: selectedStock.warehouseNumber,
            })}
          </div>
          <div className="text-sm text-gray-600">
            {t('move.currentStock', {
              stock: String(selectedStock.currentStock),
              unit: selectedStock.uomName,
            })}
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor={`${fieldId}-toWarehouseId`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('move.toWarehouse')}
            </label>
            <select
              id={`${fieldId}-toWarehouseId`}
              onChange={handleInputChange}
              name="toWarehouseId"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
            >
              <option value="">{t('move.selectWarehouse')}</option>
              {warehouseInfoRes?.map((warehouse) => (
                <option key={warehouse.warehouseId} value={warehouse.warehouseId}>
                  {warehouse.warehouseName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${fieldId}-field1`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('move.toLocation')}
            </label>
            <input
              id={`${fieldId}-field1`}
              type="text"
              readOnly
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder={t('move.locationPlaceholder')}
              value={
                warehouseInfoRes?.find(
                  (w) => String(w.warehouseId) === String(formData.toWarehouseId),
                )?.warehouseNumber ?? ''
              }
            />
          </div>

          <div>
            <label
              htmlFor={`${fieldId}-stockQuantity`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('move.quantity')}
            </label>
            <input
              id={`${fieldId}-stockQuantity`}
              type="number"
              name="stockQuantity"
              value={formData.stockQuantity}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder={t('move.quantityPlaceholder')}
              max={selectedStock.currentStock}
            />
          </div>

          <div>
            <label
              htmlFor={`${fieldId}-reason`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('move.reason')}
            </label>
            <input
              id={`${fieldId}-reason`}
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder={t('move.reasonPlaceholder')}
              maxLength={18}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowMoveModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isMoving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMoving ? t('move.submitting') : t('move.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryMoveModal;
