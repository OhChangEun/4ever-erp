'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWarehouseInfo, postStockMovement } from '../../inventory.api';
import { useEffect, useMemo, useState } from 'react';
import { InventoryMoveModalProps } from '../../types/InventoryMoveModalType';
import {
  WarehouseToggleQueryParams,
  WarehouseToggleResponse,
} from '../../types/AddInventoryModalType';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { InventoryDetailResponse } from '../../types/InventoryDetailModalType';

const InventoryMoveModal = ({ $setShowMoveModal, $selectedStock }: InventoryMoveModalProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fromWarehouseId: $selectedStock.warehouseId,
    toWarehouseId: '',
    itemId: $selectedStock.itemId,
    stockQuantity: 0,
    uomName: $selectedStock.uomName,
    reason: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    moveStock(formData);
  };

  // -----------------------------

  const queryParams = useMemo(() => {
    const params: WarehouseToggleQueryParams = {
      warehouseId: $selectedStock.warehouseId,
    };
    return params;
  }, [$selectedStock.warehouseId]);

  const {
    data: warehouseInfoRes,
    isLoading,
    isError,
  } = useQuery<WarehouseToggleResponse[]>({
    queryKey: ['getWarehouseInfo', queryParams],
    queryFn: ({ queryKey }) => getWarehouseInfo(queryKey[1] as WarehouseToggleQueryParams),
    enabled: !!$selectedStock.itemId,
  });
  // 낙관적 업데이트x
  // const { mutate: moveStock } = useMutation({
  //   mutationFn: postStockMovement,
  //   onSuccess: (data) => {
  //     alert(`${data.status} : ${data.message}
  //     `);
  //     $setShowMoveModal(false);
  //   },
  //   onError: () => {
  //     alert(` 등록 중 오류가 발생했습니다.`);
  //   },
  // });

  // 낙관적 업데이트
  const { mutate: moveStock } = useMutation({
    mutationFn: postStockMovement,
    onMutate: async (newMovement) => {
      await queryClient.cancelQueries({ queryKey: ['inventoryDetail', $selectedStock?.itemId] });

      const previousData = queryClient.getQueryData<InventoryDetailResponse[]>([
        'inventoryDetail',
        queryParams,
      ]);

      if (previousData) {
        const updatedData = previousData.map((warehouse) => {
          // 출발 창고 재고 감소
          if (warehouse.warehouseId === newMovement.fromWarehouseId) {
            return {
              ...warehouse,
              currentStock: warehouse.currentStock - newMovement.stockQuantity,
            };
          }
          // 도착 창고 재고 증가
          if (warehouse.warehouseId === newMovement.toWarehouseId) {
            return {
              ...warehouse,
              currentStock: warehouse?.currentStock + newMovement.stockQuantity,
            };
          }
          return warehouse;
        });
        queryClient.setQueryData(['inventoryDetail', $selectedStock?.itemId], updatedData);
      }
      return { previousData };
    },

    onError: (error, _newMovement, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventoryDetail', $selectedStock?.itemId], context.previousData);
      }
      alert(`재고 이동 중 오류가 발생했습니다. ${error}`);
    },

    onSuccess: (data) => {
      alert(`재고가 이동되었습니다.`);
      $setShowMoveModal(false);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryDetail', $selectedStock?.itemId] });
    },
  });

  const [errorModal, setErrorModal] = useState(false);
  useEffect(() => {
    setErrorModal(isError);
  }, [isError]);

  if (isLoading)
    return <ModalStatusBox $type="loading" $message="창고 정보를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        $type="error"
        $message="창고 정보를 불러오는 중 오류가 발생했습니다."
        $onClose={() => setErrorModal(false)}
      />
    );
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-overlay">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">재고 이동</h3>
          <button
            onClick={() => $setShowMoveModal(false)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-900">{$selectedStock.itemName}</div>
          <div className="text-sm text-gray-500">{$selectedStock.itemNumber}</div>
          <div className="text-sm text-gray-600 mt-1">
            현재 위치: {$selectedStock.warehouseName} ({$selectedStock.warehouseNumber})
          </div>
          <div className="text-sm text-gray-600">
            현재 재고: {$selectedStock.currentStock} {$selectedStock.uomName}
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이동할 창고</label>
            <select
              onChange={handleInputChange}
              name="toWarehouseId"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
            >
              <option value="">창고를 선택하세요</option>
              {warehouseInfoRes?.map((warehouse) => (
                <option key={warehouse.warehouseId} value={warehouse.warehouseId}>
                  {warehouse.warehouseName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이동할 위치</label>
            <input
              type="text"
              readOnly
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="예: A-01-01"
              value={
                warehouseInfoRes?.find(
                  (w) => String(w.warehouseId) === String(formData.toWarehouseId),
                )?.warehouseNumber ?? ''
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이동 수량</label>
            <input
              type="number"
              name="stockQuantity"
              value={formData.stockQuantity}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="이동할 수량을 입력하세요"
              max={$selectedStock.currentStock}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이동 사유</label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="이동 사유를 입력하세요"
              maxLength={18}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => $setShowMoveModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium cursor-pointer"
            >
              이동
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryMoveModal;
