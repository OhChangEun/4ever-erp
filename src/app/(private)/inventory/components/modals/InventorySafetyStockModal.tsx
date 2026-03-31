'use client';

import { FormEvent, useState } from 'react';
import { InventorySafetyStockModalProps } from '../../types/InventorySafetyStockModalType';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PatchSafetyStock } from '../../inventory.api';
import { InventoryDetailResponse } from '../../types/InventoryDetailModalType';

const InventorySafetyStockModal = ({
  $setShowSafetyStockModal,
  $selectedStock,
}: InventorySafetyStockModalProps) => {
  const queryClient = useQueryClient();
  const [newSafetyStock, setNewSafetyStock] = useState<number>(0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    editSafetyStock({ itemId: $selectedStock?.itemId as string, safetyStock: newSafetyStock });
  };
  // 낙관적 업데이트x
  // const { mutate: editSafetyStock } = useMutation({
  //   mutationFn: PatchSafetyStock,
  //   onSuccess: (data) => {
  //     alert(`${data.status} : ${data.message}
  //     `);
  //     $setShowSafetyStockModal(false);
  //   },
  //   onError: (error) => {
  //     alert(` 등록 중 오류가 발생했습니다. ${error}`);
  //   },
  // });

  // 낙관적 업데이트
  const { mutate: editSafetyStock } = useMutation({
    mutationFn: PatchSafetyStock,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['inventoryDetail', $selectedStock.itemId] });

      const previousData = queryClient.getQueryData<{ data: InventoryDetailResponse }>([
        'inventoryDetail',
        $selectedStock.itemId,
      ]);

      queryClient.setQueryData<{ data: InventoryDetailResponse }>(
        ['inventoryDetail', $selectedStock.itemId],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            data: {
              ...oldData.data,
              safetyStock: variables.safetyStock,
            },
          };
        },
      );

      return { previousData };
    },

    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventoryDetail', $selectedStock.itemId], context.previousData);
      }
      alert(`등록 중 오류가 발생했습니다. ${err}`);
    },

    onSuccess: (data) => {
      alert(`${data.status} : ${data.message}`);
      $setShowSafetyStockModal(false);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryDetail', $selectedStock.itemId] });
    },
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-overlay">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">안전 재고 수정</h3>
          <button
            onClick={() => $setShowSafetyStockModal(false)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-900">{$selectedStock.itemName}</div>
          <div className="text-sm text-gray-500">{$selectedStock.itemNumber}</div>
          <div className="text-sm text-gray-600 mt-1">
            현재 안전재고: {$selectedStock.safetyStock} {$selectedStock.uomName}
          </div>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 안전재고 수량</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="안전재고 수량"
              defaultValue={$selectedStock.safetyStock}
              value={newSafetyStock === 0 ? undefined : newSafetyStock}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setNewSafetyStock(Number(e.target.value));
              }}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => $setShowSafetyStockModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
            >
              수정
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventorySafetyStockModal;
