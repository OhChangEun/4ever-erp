'use client';

import React, { useState } from 'react';
import { PURCHASE_REQUEST_TABLE_HEADERS } from '@/app/(private)/purchase/constants';
import { Button } from '@everp/ui';
import { Input } from '@everp/ui';
import { useCreatePurchaseRequest } from '@/app/(private)/purchase/api/purchase.mutations';
import { DropdownInputModal } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import {
  type CreatePurchaseRequestBody,
  type PurchaseRequestFormItem,
} from '@/app/(private)/purchase/types/PurchaseRequestType';
import { toISOString } from '@/app/utils/date';
import CalendarButton from '@/app/components/common/CalendarButton';
import { useToast } from '@/app/components/common/toast/useToast';
import { useErrorMessage } from '@/i18n/useErrorMessage';

import { formatCurrency } from '@/app/utils/number';
import { toDateKey } from '@/app/utils/date';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/app/(public)/profile/profile.api';
import { profileKeys } from '@/app/(public)/profile/profile.keys';
import TableStatusBox from '@/app/components/common/TableStatusBox';

// 게이트웨이가 프로필 응답을 그대로 중계하므로 두 부서명 필드를 허용한다.
function requestingDepartmentOf(profile: unknown): string {
  if (typeof profile !== 'object' || profile === null) return '';
  for (const key of ['department', 'departmentName']) {
    const value: unknown = Reflect.get(profile, key);
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

export default function PurchaseRequestFormModal({ onClose }: ModalProps) {
  const [requestItems, setRequestItems] = useState<PurchaseRequestFormItem[]>([
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
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  const t = useTranslations('purchase.requestForm');
  const tc = useTranslations('purchase.common');
  const {
    data: profile,
    isFetching: isLoadingDepartment,
    isSuccess: isDepartmentLoaded,
    isError: isDepartmentError,
    error: departmentError,
    refetch: refetchDepartment,
  } = useQuery({
    queryKey: profileKeys.info(),
    queryFn: getProfile,
    refetchOnMount: 'always',
  });
  const department =
    isDepartmentLoaded && !isLoadingDepartment ? requestingDepartmentOf(profile) : '';
  // 무효화는 훅이 한다. 여기선 알리고 닫고 폼을 비운다.
  const { mutate: submitPurchaseRequest, isPending } = useCreatePurchaseRequest({
    onSuccess: () => {
      toast.success(t('success', { count: requestItems.length }));
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
      toast.error(t('error', { message: errorMessageOf(error) }));
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
    const newItem: PurchaseRequestFormItem = {
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
    field: keyof PurchaseRequestFormItem,
    value: string | number,
  ): void => {
    setRequestItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmitRequest = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!department || isPending) return;

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
      toast.warning(tc('required'));
      return;
    }

    const purchaseRequestData: CreatePurchaseRequestBody = {
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

    submitPurchaseRequest(purchaseRequestData);
  };

  return (
    <form onSubmit={handleSubmitRequest} className="p-6 space-y-6">
      {/* 요청 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label={t('department')} value={department} readOnly disabled />
        <Input
          label={t('requestDate')}
          type="text"
          value={toDateKey(new Date())}
          readOnly
          disabled
        />
      </div>

      {isLoadingDepartment ? (
        <TableStatusBox type="loading" message={t('departmentLoading')} />
      ) : isDepartmentError ? (
        <TableStatusBox type="error" message={t('departmentError')} error={departmentError} />
      ) : !department ? (
        <TableStatusBox type="error" message={t('departmentMissing')} />
      ) : null}
      {!isLoadingDepartment && !department && (
        <Button label={t('retry')} variant="secondary" onClick={() => void refetchDepartment()} />
      )}

      {/* 구매 품목 목록 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">{t('itemsTitle')}</h4>
          <Button
            type="button"
            variant="secondary"
            label={t('addItem')}
            size="sm"
            onClick={addRequestItem}
          />
        </div>

        <div className="overflow-x-auto h-[360px] rounded-lg overflow-scroll border border-gray-200">
          <table className="w-full rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                {PURCHASE_REQUEST_TABLE_HEADERS.map((column) => (
                  <th
                    key={column ?? 'remove'}
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center whitespace-nowrap"
                  >
                    {column ? t(`columns.${column}`) : ''}
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
                      placeholder={t('placeholders.itemName')}
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
                      placeholder={t('placeholders.quantity')}
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="text"
                      value={item.uomName}
                      onChange={(e) => updateRequestItem(item.id, 'uomName', e.target.value)}
                      placeholder={t('placeholders.unit')}
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
                      placeholder={t('placeholders.unitPrice')}
                      required
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(calculateItemTotal(item.quantity, item.expectedUnitPrice))}
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="text"
                      value={item.preferredSupplierName || ''}
                      onChange={(e) =>
                        updateRequestItem(item.id, 'preferredSupplierName', e.target.value)
                      }
                      placeholder={t('placeholders.supplier')}
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <CalendarButton
                      minDate={new Date()}
                      selectedDate={item.dueDate || null}
                      onDateChange={(date) => updateRequestItem(item.id, 'dueDate', date || '')}
                      placeholder={t('placeholders.dueDate')}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DropdownInputModal
                      placeholder={t('placeholders.purpose')}
                      value={item.purpose}
                      onSubmit={(value) => updateRequestItem(item.id, 'purpose', value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DropdownInputModal
                      placeholder={t('placeholders.note')}
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
              <span className="text-sm font-medium text-gray-700">{t('grandTotal')}</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(calculateGrandTotal())}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
        <Button label={tc('cancel')} variant="secondary" onClick={onClose} />
        <Button
          label={isPending ? t('submitting') : t('submit')}
          type="submit"
          disabled={isPending || !department}
        />
      </div>
    </form>
  );
}
