'use client';

import { useState, useId } from 'react';
import {
  type NewOrderRequest,
  type NewOrderItem,
  type ItemResponse,
} from '@/app/(private)/sales/types/NewOrderModalType';
import { useQuery } from '@tanstack/react-query';
import { getItemInfoForNewQuote } from '../../sales.api';
import { useCreateQuote } from '../../sales.mutations';
import { quoteKeys } from '@/app/(private)/sales/sales.keys';
import { ModalStatusBox } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { Button } from '@everp/ui';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';

import { formatCurrency } from '@/app/utils/number';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
import { useTranslations } from 'next-intl';
const NewOrderModal = ({ onClose }: ModalProps) => {
  // 대시보드에서도 열린다. 대시보드 레이아웃이 영업 메시지를 같이 감싼다(i18n 8)
  const t = useTranslations('sales.newOrder');
  const tc = useTranslations('sales.common');
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const [newOrderItems, setNewOrderItems] = useState<NewOrderRequest>({
    items: [
      {
        itemId: '',
        quantity: 1,
        unitPrice: 0,
      },
    ],
    note: '',
  });
  const toast = useToast();

  const addOrderItem = () => {
    setNewOrderItems((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemId: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
    }));
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    index?: number,
  ) => {
    const { name, value } = e.target;

    setNewOrderItems((prev) => {
      if (typeof index === 'number') {
        return {
          ...prev,
          items: prev.items.map((item, i) =>
            i === index
              ? {
                  ...item,
                  [name]: name === 'quantity' ? Number(value) : value,
                }
              : item,
          ),
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const removeOrderItem = (itemIndex: number) => {
    if (newOrderItems.items.length > 1) {
      setNewOrderItems((prev) => ({
        ...prev,
        items: prev.items.filter((_, index) => index !== itemIndex),
      }));
    }
  };

  const getItemTotalPrice = (item: NewOrderItem) => {
    const totalPrice = item.quantity * item.unitPrice;
    return formatCurrency(totalPrice);
  };

  const getTotalAmount = () => {
    return newOrderItems.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 성공 토스트와 입력 초기화는 서버가 받은 뒤(onSuccess). 실패하면 입력을 남긴다
    addOrder(newOrderItems);
  };

  const handleClose = (e: React.FormEvent) => {
    onClose();
    e.preventDefault();
    setNewOrderItems({
      items: [
        {
          itemId: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
      note: '',
    });
  };

  const {
    data: ItemInfoRes,
    isLoading,
    isError,
  } = useQuery<ItemResponse[]>({
    queryKey: quoteKeys.itemInfoForNew(),
    queryFn: getItemInfoForNewQuote,
  });

  const { mutate: addOrder, isPending: isCreating } = useCreateQuote({
    onSuccess: () => {
      toast.success(t('success'));
      setNewOrderItems({
        items: [
          {
            itemId: '',
            quantity: 1,
            unitPrice: 0,
          },
        ],
        note: '',
      });
    },
    onError: (error) => toast.error(t('createError', { message: errorMessageOf(error) })),
  });

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading) return <ModalStatusBox type="loading" message={t('loading')} />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox
        type="error"
        message={t('loadError')}
        onClose={() => {
          errorDialog.dismiss();
        }}
      />
    );

  return (
    <>
      {/* 신규 견적 요청 모달 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 주문 품목 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">{t('itemsTitle')}</h4>
            <button
              type="button"
              onClick={addOrderItem}
              className="mt-4 inline-flex items-center px-4 py-2 bg-white border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
            >
              <i className="ri-add-line mr-2 text-base"></i>
              {t('addItem')}
            </button>
          </div>

          <div className="space-y-4">
            {newOrderItems.items.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label
                      htmlFor={`${fieldId}-itemId-${index}`}
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {t('item')}
                    </label>
                    <select
                      id={`${fieldId}-itemId-${index}`}
                      value={item.itemId}
                      name="itemId"
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedProduct = ItemInfoRes?.find((p) => p.itemId === selectedId);

                        setNewOrderItems((prev) => ({
                          ...prev,
                          items: prev.items.map((it, i) =>
                            i === index
                              ? {
                                  ...it,
                                  itemId: selectedProduct?.itemId ?? '',
                                  unitPrice: selectedProduct?.unitPrice ?? 0,
                                }
                              : it,
                          ),
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                      required
                    >
                      <option value="">{t('selectItem')}</option>
                      {ItemInfoRes?.map((item) => (
                        <option key={item.itemId} value={item.itemId}>
                          {item.itemName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`${fieldId}-quantity-${index}`}
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {t('quantity')}
                    </label>
                    <input
                      id={`${fieldId}-quantity-${index}`}
                      type="number"
                      name="quantity"
                      value={item.quantity}
                      onChange={(e) => handleFormChange(e, index)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${fieldId}-unitPrice-${index}`}
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {t('unitPrice')}
                    </label>
                    <input
                      id={`${fieldId}-unitPrice-${index}`}
                      type="text"
                      name="unitPrice"
                      value={formatCurrency(item.unitPrice)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                      readOnly
                    />
                  </div>
                  {/* <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            납기일 *
                          </label>
                          <input
                            type="date"
                            name="dueDate"
                            value={item.dueDate}
                            onChange={(e) => handleFormChange(e, index)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            required
                          />
                        </div> */}
                  <div className="flex items-end">
                    <div className="flex-1">
                      <label
                        htmlFor={`${fieldId}-field4-${index}`}
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        {t('amount')}
                      </label>
                      <input
                        id={`${fieldId}-field4-${index}`}
                        type="text"
                        value={getItemTotalPrice(item)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-medium"
                        readOnly
                      />
                    </div>
                    {newOrderItems.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        className="ml-2 p-2 text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-white rounded-lg border-1 border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">{t('total')}</span>
              <span className="text-xl font-bold text-gray-600">
                {formatCurrency(getTotalAmount())}
              </span>
            </div>
          </div>
        </div>

        {/* 비고 */}
        <div>
          <label
            htmlFor={`${fieldId}-note`}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {tc('note')}
          </label>
          <textarea
            id={`${fieldId}-note`}
            value={newOrderItems.note}
            name="note"
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            rows={3}
            placeholder={tc('requestNotePlaceholder')}
          ></textarea>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer whitespace-nowrap"
          >
            {tc('cancel')}
          </button>
          <Button type="submit" label={t('submit')} loading={isCreating} />
        </div>
      </form>
    </>
  );
};

export default NewOrderModal;
