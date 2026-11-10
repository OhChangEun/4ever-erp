'use client';

import { type FormEvent, useState, useId } from 'react';
import { type InventorySafetyStockModalProps } from '../../types/InventorySafetyStockModalType';
import { useUpdateSafetyStock } from '../../inventory.mutations';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';

const InventorySafetyStockModal = ({
  setShowSafetyStockModal,
  selectedStock,
}: InventorySafetyStockModalProps) => {
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const toast = useToast();
  const [newSafetyStock, setNewSafetyStock] = useState<number>(0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    editSafetyStock({ itemId: selectedStock.itemId, safetyStock: newSafetyStock });
  };
  // 낙관적 업데이트(상세와 목록 행의 안전재고)와 무효화는 inventory.mutations.ts 한 곳.
  const { mutate: editSafetyStock, isPending } = useUpdateSafetyStock({
    onSuccess: () => {
      toast.success('안전재고가 수정되었습니다.');
      setShowSafetyStockModal(false);
    },
    onError: (error) =>
      toast.error(`안전재고 수정 중 오류가 발생했습니다. ${errorMessageOf(error)}`),
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-overlay">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">안전 재고 수정</h3>
          <button
            onClick={() => setShowSafetyStockModal(false)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-900">{selectedStock.itemName}</div>
          <div className="text-sm text-gray-500">{selectedStock.itemNumber}</div>
          <div className="text-sm text-gray-600 mt-1">
            현재 안전재고: {selectedStock.safetyStock} {selectedStock.uomName}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor={`${fieldId}-field0`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              새 안전재고 수량
            </label>
            <input
              id={`${fieldId}-field0`}
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="안전재고 수량"
              defaultValue={selectedStock.safetyStock}
              value={newSafetyStock === 0 ? undefined : newSafetyStock}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setNewSafetyStock(Number(e.target.value));
              }}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowSafetyStockModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? '수정 중...' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventorySafetyStockModal;
