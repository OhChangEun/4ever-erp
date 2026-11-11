'use client';

import { useRequestPurchaseForLowStock } from '@/app/(private)/inventory/inventory.mutations';
import type { CreateStockPurchaseRequestItem } from '@/app/(private)/purchase';
import { Input } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useState } from 'react';
import { useToast } from '@/app/components/common/toast/useToast';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { useTranslations } from 'next-intl';

import { formatCurrency, formatNumber } from '@/app/utils/number';
import { Button } from '@everp/ui';
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
  const t = useTranslations('inventory');
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

  const errorMessageOf = useErrorMessage();
  const toast = useToast();

  // 무효화(부족 재고 목록, 구매 요청 목록, 구매 통계)는 inventory.mutations.ts 한 곳.
  const { mutate: registerStockPurchaseReq, isPending } = useRequestPurchaseForLowStock({
    onSuccess: () => {
      toast.success(t('purchaseRequest.success'));
      onClose();
    },
    onError: (error) => toast.error(t('purchaseRequest.error', { message: errorMessageOf(error) })),
  });

  const handleSubmit = async () => {
    // 백엔드 API 형식으로 변환
    const requestItems: CreateStockPurchaseRequestItem[] = quantities
      .filter((q) => q.quantity > 0)
      .map((q) => ({
        productId: q.itemId,
        quantity: q.quantity,
      }));

    if (requestItems.length === 0) {
      toast.warning(t('purchaseRequest.quantityRequired'));
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
            const shortage = item.safetyStock - item.currentStock;

            return (
              <div key={item.itemId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between gap-8 items-center">
                  {/* 품목 정보 */}
                  <div className="col-span-4">
                    <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                    <div className="text-xs text-gray-500">{item.itemNumber}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t('purchaseRequest.stockLine', {
                        current: formatNumber(item.currentStock),
                        safety: formatNumber(item.safetyStock),
                        unit: item.uomName,
                      })}
                      {shortage > 0 && (
                        <span className="text-red-600 ml-1">
                          {t('purchaseRequest.shortage', { count: formatNumber(shortage) })}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 단가 */}
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500">{t('purchaseRequest.unitPrice')}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </div>
                  </div>
                  {/* 수량 입력 */}
                  <Input
                    label={t('purchaseRequest.quantity')}
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
            <span className="text-lg font-semibold text-gray-900">
              {t('purchaseRequest.grandTotal')}
            </span>
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(calculateGrandTotal())}
            </span>
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
        <Button
          label={t('purchaseRequest.submit')}
          onClick={() => void handleSubmit()}
          loading={isPending}
        />
      </div>
    </>
  );
}
