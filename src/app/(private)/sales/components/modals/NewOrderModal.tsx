'use client';

import { useEffect, useState } from 'react';
import {
  NewOrderModalProps,
  Product,
  NewOrderRequest,
  NewOrderItem,
  ItemResponse,
} from '@/app/(private)/sales/types/NewOrderModalType';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getItemInfoForNewQuote, postNewQuote } from '../../sales.api';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { ModalProps } from '@/app/components/common/modal/types';
import Button from '@/app/components/common/Button';
import { useToast } from '@/app/components/common/toast/useToast';

const NewOrderModal = ({ onClose }: ModalProps) => {
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
    return `₩${totalPrice.toLocaleString()}`;
  };

  const getTotalAmount = () => {
    return newOrderItems.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addOrder(newOrderItems);
    toast.success('신규 견적 요청이 등록되었습니다.');

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
    queryKey: ['getItemInfoForNewQuote'],
    queryFn: getItemInfoForNewQuote,
  });

  const { mutate: addOrder } = useMutation({
    mutationFn: postNewQuote,
    onSuccess: (data) => {
      console.log(data);
    },
    onError: (error) => {
      toast.error(` 견적 요청 중 오류가 발생했습니다. ${error}`);
    },
  });

  const [errorModal, setErrorModal] = useState(false);

  useEffect(() => {
    setErrorModal(isError);
  }, [isError]);

  if (isLoading)
    return <ModalStatusBox $type="loading" $message="자재 정보를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        $type="error"
        $message="자재 정보를 불러오는 중 오류가 발생했습니다."
        $onClose={() => {
          setErrorModal(false);
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
            <h4 className="text-lg font-semibold text-gray-900">주문 품목</h4>
            <button
              type="button"
              onClick={addOrderItem}
              className="mt-4 inline-flex items-center px-4 py-2 bg-white border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
            >
              <i className="ri-add-line mr-2 text-base"></i>
              제품 추가
            </button>
          </div>

          <div className="space-y-4">
            {newOrderItems.items.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">제품명 *</label>
                    <select
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
                      <option value="">제품을 선택하세요</option>
                      {ItemInfoRes?.map((item) => (
                        <option key={item.itemId} value={item.itemId}>
                          {item.itemName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">수량 *</label>
                    <input
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">단가</label>
                    <input
                      type="text"
                      name="unitPrice"
                      value={`₩${item.unitPrice.toLocaleString()}`}
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">금액</label>
                      <input
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
              <span className="text-lg font-semibold text-gray-900">총 주문 금액</span>
              <span className="text-xl font-bold text-gray-600">
                ₩{getTotalAmount().toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 비고 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">비고</label>
          <textarea
            value={newOrderItems.note}
            name="note"
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            rows={3}
            placeholder="추가 요청사항이나 특이사항을 입력하세요"
          ></textarea>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer whitespace-nowrap"
          >
            취소
          </button>
          <Button type="submit" label="견적 요청 등록" />
        </div>
      </form>
    </>
  );
};

export default NewOrderModal;
