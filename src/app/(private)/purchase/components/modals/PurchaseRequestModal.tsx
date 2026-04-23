'use client';

import React, { useState } from 'react';
import { PURCHASE_REQUEST_TABLE_HEADERS, SUPPLIERS } from '@/app/(private)/purchase/constants';
import IconButton from '@/app/components/common/IconButton';
import Button from '@/app/components/common/Button';
import Input from '@/app/components/common/Input';
import { useMutation } from '@tanstack/react-query';
import { createPurchaseRequest } from '@/app/(private)/purchase/api/purchase.api';
import DropdownInputModal from '@/app/components/common/DropdownInputModal';
import { ModalProps } from '@/app/components/common/modal/types';
import {
  PurchaseRequestBody,
  PurchaseRequestItem,
} from '@/app/(private)/purchase/types/PurchaseApiRequestType';
import { toISOString } from '@/app/utils/date';
import CalendarButton from '@/app/components/common/CalendarButton';
import { useToast } from '@/app/components/common/toast/useToast';

export default function PurchaseRequestModal({ onClose }: ModalProps) {
  const [requestItems, setRequestItems] = useState<PurchaseRequestItem[]>([
    {
      id: '1',
      itemName: '',
      quantity: 0,
      uomName: '',
      expectedUnitPrice: 0,
      preferredSupplierName: '',
      dueDate: '',
      purpose: '',
      note: '',
    },
  ]);
  const toast = useToast();

  const { mutate: submitPurchaseRequest, isPending } = useMutation({
    mutationFn: (data: PurchaseRequestBody) => createPurchaseRequest(data),
    onSuccess: (data) => {
      console.log('구매 요청 성공: ', data);
      toast.success(`총 ${requestItems.length}개 품목의 구매 요청이 성공적으로 제출되었습니다.`);
      onClose();
      setRequestItems([
        {
          id: '1',
          itemName: '',
          quantity: 0,
          uomName: '',
          expectedUnitPrice: 0,
          preferredSupplierName: '',
          dueDate: '',
          purpose: '',
          note: '',
        },
      ]);
    },
    onError: (error) => {
      console.log(`구매 요청 중 오류 발생: ${error}`);
      toast.error('구매 요청 중 오류가 발생했습니다.');
    },
  });

  const calculateItemTotal = (quantity: number, price: number): number => {
    return (quantity || 0) * (price || 0);
  };

  const calculateGrandTotal = (): number => {
    return requestItems.reduce(
      (total, item) => total + calculateItemTotal(item.quantity, item.expectedUnitPrice),
      0,
    );
  };

  const addRequestItem = (): void => {
    const newItem: PurchaseRequestItem = {
      id: Date.now().toString(),
      itemName: '',
      quantity: 0,
      uomName: '',
      expectedUnitPrice: 0,
      preferredSupplierName: '',
      dueDate: '',
      purpose: '',
      note: '',
    };
    setRequestItems((prev) => [...prev, newItem]);
  };

  const removeRequestItem = (id: string): void => {
    if (requestItems.length > 1) {
      setRequestItems(requestItems.filter((item) => item.id !== id));
    }
  };

  const updateRequestItem = (
    id: string,
    field: keyof PurchaseRequestItem,
    value: string | number,
  ): void => {
    setRequestItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmitRequest = (e: React.FormEvent): void => {
    e.preventDefault();

    // 필수값 검증
    const invalidItems = requestItems.filter(
      (item) =>
        !item.itemName.trim() ||
        !item.quantity ||
        !item.uomName.trim() ||
        !item.expectedUnitPrice ||
        !item.preferredSupplierName.trim() ||
        !item.dueDate ||
        !item.purpose.trim(),
    );

    if (invalidItems.length > 0) {
      toast.warning('모든 필수 항목을 입력해주세요.');
      return;
    }

    const purchaseRequestData: PurchaseRequestBody = {
      requesterId: '1234',
      items: requestItems.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        uomName: item.uomName,
        expectedUnitPrice: item.expectedUnitPrice,
        preferredSupplierName: item.preferredSupplierName,
        dueDate: toISOString(item.dueDate),
        purpose: item.purpose,
        note: item.note,
      })),
    };

    console.log('구매 요청 데이터:', purchaseRequestData);
    submitPurchaseRequest(purchaseRequestData);
  };

  return (
    <form onSubmit={handleSubmitRequest} className="p-6 space-y-6">
      {/* 요청 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="요청 부서" value="생산팀" readOnly disabled />
        <Input
          label="요청일"
          type="text"
          value={new Date().toISOString().split('T')[0]}
          readOnly
          disabled
        />
      </div>

      {/* 구매 품목 목록 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">구매 품목 목록</h4>
          <IconButton
            type="button"
            variant="soft"
            label="품목 추가"
            size="sm"
            icon="ri-add-line"
            onClick={addRequestItem}
          />
        </div>

        <div className="overflow-x-auto h-[360px] rounded-lg overflow-scroll border border-gray-200">
          <table className="w-full rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                {PURCHASE_REQUEST_TABLE_HEADERS.map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {requestItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <Input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => updateRequestItem(item.id, 'itemName', e.target.value)}
                      placeholder="품목명 입력"
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) =>
                        updateRequestItem(item.id, 'quantity', Number(e.target.value))
                      }
                      placeholder="수량"
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="text"
                      value={item.uomName}
                      onChange={(e) => updateRequestItem(item.id, 'uomName', e.target.value)}
                      placeholder="EA, KG 등"
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      value={item.expectedUnitPrice || ''}
                      onChange={(e) =>
                        updateRequestItem(item.id, 'expectedUnitPrice', Number(e.target.value))
                      }
                      placeholder="단가"
                      required
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    ₩{calculateItemTotal(item.quantity, item.expectedUnitPrice).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="text"
                      value={item.preferredSupplierName || ''}
                      onChange={(e) =>
                        updateRequestItem(item.id, 'preferredSupplierName', e.target.value)
                      }
                      placeholder="공급업체 입력"
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <CalendarButton
                      minDate={new Date()}
                      selectedDate={item.dueDate || null}
                      onDateChange={(date) => updateRequestItem(item.id, 'dueDate', date || '')}
                      placeholder="납기일 선택"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DropdownInputModal
                      placeholder="사용 목적"
                      value={item.purpose}
                      onSubmit={(value) => updateRequestItem(item.id, 'purpose', value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DropdownInputModal
                      placeholder="비고"
                      value={item.note}
                      onSubmit={(value) => updateRequestItem(item.id, 'note', value)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeRequestItem(item.id)}
                      disabled={requestItems.length === 1}
                      className={`p-1 rounded ${
                        requestItems.length === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-600 hover:text-red-800'
                      }`}
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 총합 */}
        <div className="mt-4 flex justify-end">
          <div className="bg-gray-50 rounded-lg p-4 min-w-64">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">총 예상 금액:</span>
              <span className="text-lg font-bold text-gray-900">
                ₩{calculateGrandTotal().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
        <Button label="취소" variant="whiteOutline" onClick={onClose} />
        <Button
          label={isPending ? '제출 중...' : '구매 요청 제출'}
          type="submit"
          disabled={isPending}
        />
      </div>
    </form>
  );
}
