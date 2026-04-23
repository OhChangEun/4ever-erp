'use client';

import { useEffect, useState } from 'react';
import {
  AddInventoryItemsRequest,
  AddInventoryItemsToggleResponse,
  WarehouseToggleQueryParams,
  WarehouseToggleResponse,
} from '../../types/AddInventoryModalType';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getItemInfo, getWarehouseInfo, postAddMaterial } from '../../inventory.api';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { InventoryResponse } from '../../types/InventoryListType';
import { Page } from '@/app/types/Page';
import { ModalProps } from '@/app/components/common/modal/types';
import { useToast } from '@/app/components/common/toast/useToast';

const AddInventoryModal = ({ onClose }: ModalProps) => {
  const queryClient = useQueryClient();
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
    queryKey: ['getItemInfo'],
    queryFn: getItemInfo,
  });

  const {
    data: warehouseInfoRes,
    isLoading: isWarehouseInfoLoading,
    isError: isWarehouseInfoError,
  } = useQuery<WarehouseToggleResponse[]>({
    queryKey: ['getWarehouseInfo'],
    queryFn: () => getWarehouseInfo(),
    enabled: !!formData.itemId,
  });

  // 낙관적 업데이트x
  // const { mutate: addMaterial } = useMutation({
  //   mutationFn: postAddMaterial,
  //   onSuccess: (data) => {
  //     alert(`${data.status} : ${data.message}
  //     `);
  //     $setShowAddModal(false);
  //   },
  //   onError: (error) => {
  //     alert(` 자재 등록 중 오류가 발생했습니다. ${error}`);
  //   },
  // });
  const { mutate: addMaterial, isPending: isAddingMaterial } = useMutation({
    mutationFn: postAddMaterial,

    onMutate: async (newMaterial) => {
      await queryClient.cancelQueries({ queryKey: ['inventoryList'] });

      const previousData = queryClient.getQueryData<{ data: InventoryResponse[]; pageData: Page }>([
        'inventoryList',
      ]);

      queryClient.setQueryData<{ data: InventoryResponse[]; pageData: Page }>(
        ['inventoryList'],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: [newMaterial as unknown as InventoryResponse, ...oldData.data],
          };
        },
      );

      return { previousData };
    },

    onError: (_error, _newMaterial, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventoryList'], context.previousData);
      }
      toast.error('원자재 등록 중 오류가 발생했습니다.');
    },

    onSuccess: () => {
      toast.success('원자재가 성공적으로 등록되었습니다.');
      onClose();
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryList'] });
    },
  });

  const [errorModal, setErrorModal] = useState(false);

  useEffect(() => {
    setErrorModal(isItemInfoLoading || isWarehouseInfoLoading);
  }, [isItemInfoLoading, isWarehouseInfoLoading]);

  if (isItemInfoLoading)
    return <ModalStatusBox $type="loading" $message="자재 정보를 불러오는 중입니다..." />;

  if (isWarehouseInfoLoading)
    return <ModalStatusBox $type="loading" $message="창고 정보를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        $type="error"
        $message="자재 정보를 불러오는 중 오류가 발생했습니다."
        $onClose={() => setErrorModal(false)}
      />
    );

  if (errorModal)
    return (
      <ModalStatusBox
        $type="error"
        $message="창고 정보를 불러오는 중 오류가 발생했습니다."
        $onClose={() => setErrorModal(false)}
      />
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            자재명 <span className="text-red-500">*</span>
          </label>
          <select
            name="itemId"
            value={formData.itemId}
            onChange={handleSelectMaterial}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
            required
          >
            <option value="">자재를 선택하세요</option>
            {ItemInfoRes?.map((item) => (
              <option key={item.itemId} value={item.itemId}>
                {item.itemName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">공급사</label>
          <input
            type="text"
            readOnly
            value={selectedItem?.supplierCompanyName ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">단가</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 text-sm">₩</span>
            <input
              type="text"
              readOnly
              value={selectedItem?.unitPrice?.toLocaleString() ?? ''}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">단위</label>
          <input
            type="text"
            readOnly
            value={selectedItem?.uomName ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            안전재고 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="safetyStock"
            value={formData.safetyStock}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="최소 보유 수량"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            초기재고 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="currentStock"
            value={formData.currentStock}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="초기 재고 수량"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            보관위치 (창고) <span className="text-red-500">*</span>
          </label>
          <select
            name="warehouseId"
            value={formData.warehouseId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
            required
          >
            <option value="">창고를 선택하세요</option>
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
          취소
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
        >
          추가
        </button>
      </div>
    </form>
  );
};

export default AddInventoryModal;
