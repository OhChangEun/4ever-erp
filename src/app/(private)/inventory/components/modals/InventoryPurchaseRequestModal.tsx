'use client';

import { createStockPurchaseRequest } from '@/app/(private)/purchase/api/purchase.api';
import { StockPurchaseRequestItem } from '@/app/(private)/purchase/types/PurchaseApiRequestType';
import IconButton from '@/app/components/common/IconButton';
import Input from '@/app/components/common/Input';
import { ModalProps } from '@/app/components/common/modal/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '@/app/components/common/toast/useToast';

interface SelectedItem {
  itemId: string;
  itemNumber: string;
  itemName: string;
  unitPrice: number;
  safetyStock: number;
  currentStock: number;
  uomName: string;
}

interface InventoryPurchaseRequestModalProps extends ModalProps {
  items: SelectedItem[];
}

interface ItemQuantity {
  itemId: string;
  quantity: number;
}

export default function InventoryPurchaseRequestModal({
  items,
  onClose,
}: InventoryPurchaseRequestModalProps) {
  const [quantities, setQuantities] = useState<ItemQuantity[]>(
    items.map((item) => ({
      itemId: item.itemId,
      quantity: Math.max(item.safetyStock - item.currentStock, 0),
    })),
  );

  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setQuantities((prev) =>
      prev.map((q) => (q.itemId === itemId ? { ...q, quantity: numValue } : q)),
    );
  };

  const calculateTotal = (itemId: string) => {
    const item = items.find((i) => i.itemId === itemId);
    const quantity = quantities.find((q) => q.itemId === itemId)?.quantity || 0;
    return item ? item.unitPrice * quantity : 0;
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => {
      return sum + calculateTotal(item.itemId);
    }, 0);
  };

  const queryClient = useQueryClient();
  const toast = useToast();

  const { mutate: registerStockPurchaseReq } = useMutation({
    mutationFn: (body: StockPurchaseRequestItem[]) => createStockPurchaseRequest({ items: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingList'] });
      toast.success('발주 요청이 생성되었습니다.');
      onClose();
    },
    onError: (error) => {
      console.error('발주 요청 실패:', error);
      toast.error('발주 요청 중 오류가 발생했습니다.');
    },
  });

  const handleSubmit = async () => {
    // 백엔드 API 형식으로 변환
    const requestItems: StockPurchaseRequestItem[] = quantities
      .filter((q) => q.quantity > 0)
      .map((q) => ({
        productId: q.itemId,
        quantity: q.quantity,
      }));

    if (requestItems.length === 0) {
      toast.warning('발주 수량을 입력해주세요.');
      return;
    }

    registerStockPurchaseReq(requestItems); // 부족 재고 요청
  };

  return (
    <>
      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
        <div className="space-y-4">
          {items.map((item) => {
            const quantity = quantities.find((q) => q.itemId === item.itemId)?.quantity || 0;
            const total = calculateTotal(item.itemId);
            const shortage = item.safetyStock - item.currentStock;

            return (
              <div key={item.itemId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between gap-8 items-center">
                  {/* 품목 정보 */}
                  <div className="col-span-4">
                    <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                    <div className="text-xs text-gray-500">{item.itemNumber}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      현재: {item.currentStock.toLocaleString()} {item.uomName} / 안전:{' '}
                      {item.safetyStock.toLocaleString()} {item.uomName}
                      {shortage > 0 && (
                        <span className="text-red-600 ml-1">
                          (부족: {shortage.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 단가 */}
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500">단가</div>
                    <div className="text-sm font-medium text-gray-900">
                      ₩{item.unitPrice.toLocaleString()}
                    </div>
                  </div>
                  {/* 수량 입력 */}
                  <Input
                    label="발주 수량"
                    type="number"
                    min="0"
                    maxLength={10}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(item.itemId, e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 합계 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">총 발주 금액</span>
            <span className="text-2xl font-bold text-blue-600">
              ₩{calculateGrandTotal().toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
        <IconButton label="발주 요청" icon="ri-shopping-cart-line" onClick={handleSubmit} />
      </div>
    </>
  );
}
