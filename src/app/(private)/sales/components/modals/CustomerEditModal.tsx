'use client';

import { useState, useId } from 'react';
import { type CustomerDetail } from '@/app/(private)/sales/types/SalesCustomerDetailType';
import type {
  CustomerEditData,
  CustomerEditModalProps,
} from '@/app/(private)/sales/types/CustomerEditModalType';
import { CUSTOMER_STATUS_OPTIONS } from '@/app/(private)/sales/constant';
import { useUpdateCustomer } from '../../sales.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { useToast } from '@/app/components/common/toast/useToast';

const CustomerEditModal = ({ onClose, editFormData: initial }: CustomerEditModalProps) => {
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  // 폼 상태는 이 모달이 가진다. 열 때 받은 값으로 한 번 채운다.
  // 예전엔 목록 컴포넌트의 state(처음 값 null)를 setter 로 받아 써서 입력이 하나도 반영되지 않았다
  const [editFormData, setEditFormData] = useState<CustomerDetail | null>(initial);
  const toast = useToast();

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;

    // 서버가 받는 모양으로 바꾼다. 예전엔 렌더 때 만든 let 을 핸들러가 다시 대입했다(react-hooks/immutability)
    const updatedCustomer: CustomerEditData = {
      customerName: editFormData.customerName,
      ceoName: editFormData.ceoName,
      businessNumber: editFormData.businessNumber,
      customerPhone: editFormData.customerPhone,
      customerEmail: editFormData.customerEmail,
      baseAddress: editFormData.baseAddress,
      detailAddress: editFormData.detailAddress,
      statusCode: editFormData.statusCode,
      note: editFormData.note,
      manager: {
        name: editFormData.manager.managerName,
        mobile: editFormData.manager.managerPhone,
        email: editFormData.manager.managerEmail,
      },
    };

    // 닫기는 성공했을 때만(onSuccess). 실패하면 모달과 입력이 남는다
    editCustomer({ customerId: editFormData.customerId, data: updatedCustomer });
  };

  // 무효화(고객 목록, 그 고객 상세)는 sales.mutations.ts 한 곳
  const { mutate: editCustomer, isPending } = useUpdateCustomer({
    onSuccess: () => {
      toast.success('고객 정보가 성공적으로 수정되었습니다.');
      onClose();
    },
    onError: (error) => toast.error(`고객 수정 중 오류가 발생했습니다. ${errorMessageOf(error)}`),
  });

  // 필드 업데이트 공통 함수
  const updateEditFormData = <K extends keyof CustomerDetail>(
    field: K,
    value: CustomerDetail[K],
  ) => {
    setEditFormData((prev: CustomerDetail | null) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const updateManagerInfo = <K extends keyof CustomerDetail['manager']>(
    field: K,
    value: CustomerDetail['manager'][K],
  ) => {
    setEditFormData((prev: CustomerDetail | null) => {
      if (!prev) return null;
      return {
        ...prev,
        manager: {
          ...prev.manager,
          [field]: value,
        },
      };
    });
  };

  if (!editFormData) {
    return null;
  }

  return (
    <>
      <form onSubmit={handleEditSave} className="space-y-6">
        {/* 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor={`${fieldId}-field0`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                고객번호
              </label>
              <input
                id={`${fieldId}-field0`}
                type="text"
                value={editFormData.customerNumber}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-field1`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                고객명
              </label>
              <input
                id={`${fieldId}-field1`}
                type="text"
                value={editFormData.customerName}
                onChange={(e) => updateEditFormData('customerName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-field2`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                대표이사
              </label>
              <input
                id={`${fieldId}-field2`}
                type="text"
                value={editFormData.ceoName}
                onChange={(e) => updateEditFormData('ceoName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor={`${fieldId}-field3`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                상태
              </label>
              <select
                id={`${fieldId}-field3`}
                value={editFormData.statusCode}
                onChange={(e) => {
                  // 선택지 표에 있는 코드만 받는다(문자열을 상태 유니온으로 단언하지 않는다)
                  const next = CUSTOMER_STATUS_OPTIONS.find((o) => o.key === e.target.value)?.key;
                  if (next) updateEditFormData('statusCode', next);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg pr-8"
              >
                <option value="ACTIVE">활성</option>
                <option value="INACTIVE">비활성</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-field4`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                전화번호
              </label>
              <input
                id={`${fieldId}-field4`}
                type="tel"
                value={editFormData.customerPhone}
                onChange={(e) =>
                  updateEditFormData('customerPhone', e.target.value.replace(/[^0-9\-]/g, ''))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field5`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                사업자번호
              </label>
              <input
                id={`${fieldId}-field5`}
                type="text"
                value={editFormData.businessNumber}
                onChange={(e) =>
                  updateEditFormData('businessNumber', e.target.value.replace(/[^0-9\-]/g, ''))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* 주소 */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">주소 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor={`${fieldId}-field6`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                기본 주소
              </label>
              <input
                id={`${fieldId}-field6`}
                type="text"
                value={editFormData.baseAddress}
                onChange={(e) => updateEditFormData('baseAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-field7`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                상세 주소
              </label>
              <input
                id={`${fieldId}-field7`}
                type="text"
                value={editFormData.detailAddress}
                onChange={(e) => updateEditFormData('detailAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* 담당자 */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">담당자 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor={`${fieldId}-field8`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                담당자명
              </label>
              <input
                id={`${fieldId}-field8`}
                type="text"
                value={editFormData.manager.managerName}
                onChange={(e) => updateManagerInfo('managerName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-field9`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                담당자 휴대폰
              </label>
              <input
                id={`${fieldId}-field9`}
                type="tel"
                value={editFormData.manager.managerPhone}
                onChange={(e) =>
                  updateManagerInfo('managerPhone', e.target.value.replace(/[^0-9\-]/g, ''))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-field10`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                담당자 이메일
              </label>
              <input
                id={`${fieldId}-field10`}
                type="email"
                value={editFormData.manager.managerEmail}
                onChange={(e) => updateManagerInfo('managerEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* 거래 정보 */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">거래 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor={`${fieldId}-field11`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                총 주문건수
              </label>
              <input
                id={`${fieldId}-field11`}
                type="number"
                value={editFormData.totalOrders}
                readOnly
                // onChange={(e) => updateEditFormData('totalOrders', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-field12`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                총 거래금액
              </label>
              <input
                id={`${fieldId}-field12`}
                type="number"
                value={editFormData.totalTransactionAmount}
                readOnly
                // onChange={(e) =>
                //   updateEditFormData('totalTransactionAmount', Number(e.target.value))
                // }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* 비고 */}
        <div className="border-t border-gray-200 pt-6">
          <label
            htmlFor={`${fieldId}-field13`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            비고
          </label>
          <textarea
            id={`${fieldId}-field13`}
            value={editFormData.note}
            onChange={(e) => updateEditFormData('note', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows={3}
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer whitespace-nowrap"
          >
            취소
          </button>

          <button
            type="submit"
            disabled={isPending}
            className={`px-6 py-2 rounded-lg transition-colors font-medium cursor-pointer whitespace-nowrap
                    ${
                      isPending
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
            // className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer whitespace-nowrap"
          >
            {isPending ? '수정중...' : '저장'}
          </button>
        </div>
      </form>
    </>
  );
};

export default CustomerEditModal;
