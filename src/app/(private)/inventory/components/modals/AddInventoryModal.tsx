'use client';

import { useState, useId } from 'react';
import {
  type AddInventoryItemsRequest,
  type AddInventoryItemsToggleResponse,
  type WarehouseToggleResponse,
} from '../../types/AddInventoryModalType';
import { useQuery } from '@tanstack/react-query';
import { getItemInfo, getWarehouseInfo } from '../../inventory.api';
import { useAddMaterial } from '../../inventory.mutations';
import { ModalStatusBox } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';
import { itemInfoKeys, warehouseInfoKeys } from '@/app/(private)/inventory/inventory.keys';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
import { useTranslations } from 'next-intl';

const AddInventoryModal = ({ onClose }: ModalProps) => {
  const t = useTranslations('inventory');
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const toast = useToast();
  const [selectedItem, setSelectedItem] = useState<AddInventoryItemsToggleResponse | null>(null);

  const [formData, setFormData] = useState<AddInventoryItemsRequest>({
    itemId: '',
    safetyStock: 0,
    currentStock: 0,
    warehouseId: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectMaterial = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const found = ItemInfoRes?.find((item) => item.itemId === id) || null;

    setSelectedItem(found);
    setFormData((prev) => ({
      ...prev,
      itemId: found?.itemId ?? '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMaterial(formData);
  };

  const handleClose = () => {
    onClose();
  };

  //------------------------------
  const {
    data: ItemInfoRes,
    isLoading: isItemInfoLoading,
    isError: isItemInfoError,
  } = useQuery<AddInventoryItemsToggleResponse[]>({
    queryKey: itemInfoKeys.all,
    queryFn: getItemInfo,
  });

  const {
    data: warehouseInfoRes,
    isLoading: isWarehouseInfoLoading,
    isError: isWarehouseInfoError,
  } = useQuery<WarehouseToggleResponse[]>({
    queryKey: warehouseInfoKeys.all,
    queryFn: () => getWarehouseInfo(),
    enabled: !!formData.itemId,
  });

  // 생성이라 낙관적 업데이트를 하지 않는다(결정 7). 무효화는 inventory.mutations.ts 한 곳.
  const { mutate: addMaterial, isPending: isAddingMaterial } = useAddMaterial({
    onSuccess: () => {
      toast.success(t('add.success'));
      onClose();
    },
    onError: (error) => toast.error(t('add.error', { message: errorMessageOf(error) })),
  });

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isItemInfoError, isWarehouseInfoError);

  if (isItemInfoLoading) return <ModalStatusBox type="loading" message={t('add.itemLoading')} />;

  if (isWarehouseInfoLoading)
    return <ModalStatusBox type="loading" message={t('add.warehouseLoading')} />;

  // 오류 창은 하나. 예전엔 같은 조건을 두 번 검사해 창고 오류에도 자재 오류 문구가 떴다
  if (errorDialog.isOpen)
    return (
      <ModalStatusBox
        type="error"
        message={isItemInfoError ? t('add.itemLoadError') : t('add.warehouseLoadError')}
        onClose={() => errorDialog.dismiss()}
      />
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('add.material')} <span className="text-red-500">*</span>
          </label>
          <select
            name="itemId"
            value={formData.itemId}
            onChange={handleSelectMaterial}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
            required
          >
            <option value="">{t('add.selectMaterial')}</option>
            {ItemInfoRes?.map((item) => (
              <option key={item.itemId} value={item.itemId}>
                {item.itemName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-field0`}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t('add.supplier')}
          </label>
          <input
            id={`${fieldId}-field0`}
            type="text"
            readOnly
            value={selectedItem?.supplierCompanyName ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('add.unitPrice')}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 text-sm">₩</span>
            <input
              type="text"
              readOnly
              value={selectedItem?.unitPrice.toLocaleString() ?? ''}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-field1`}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t('add.unit')}
          </label>
          <input
            id={`${fieldId}-field1`}
            type="text"
            readOnly
            value={selectedItem?.uomName ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('add.safetyStock')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="safetyStock"
            value={formData.safetyStock}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder={t('add.safetyStockPlaceholder')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('add.initialStock')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="currentStock"
            value={formData.currentStock}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder={t('add.initialStockPlaceholder')}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('add.location')} <span className="text-red-500">*</span>
          </label>
          <select
            name="warehouseId"
            value={formData.warehouseId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
            required
          >
            <option value="">{t('add.selectWarehouse')}</option>
            {warehouseInfoRes?.map((warehouse) => (
              <option key={warehouse.warehouseId} value={warehouse.warehouseId}>
                {warehouse.warehouseName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isAddingMaterial}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAddingMaterial ? t('add.submitting') : t('add.submit')}
        </button>
      </div>
    </form>
  );
};

export default AddInventoryModal;
