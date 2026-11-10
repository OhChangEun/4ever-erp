'use client';

import { useState, useId } from 'react';
import { type CustomerData } from '@/app/(private)/sales/types/NewCustomerModalType';
import { useCreateCustomer } from '@/app/(private)/sales/sales.mutations';
import { Button } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';
const NewCustomerModal = ({ onClose }: ModalProps) => {
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const toast = useToast();
  const [customerData, setCustomerData] = useState<CustomerData>({
    companyName: '',
    businessNumber: '',
    ceoName: '',
    contactPhone: '',
    contactEmail: '',
    zipCode: '',
    address: '',
    detailAddress: '',
    manager: {
      name: '',
      mobile: '',
      email: '',
    },
    note: '',
  });

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomer(customerData);
  };

  const handleCustomerCancle = () => {
    onClose();
    setCustomerData({
      companyName: '',
      businessNumber: '',
      ceoName: '',
      contactPhone: '',
      contactEmail: '',
      zipCode: '',
      address: '',
      detailAddress: '',
      manager: {
        name: '',
        mobile: '',
        email: '',
      },
      note: '',
    });
  };

  const updateCustomerData = <K extends keyof CustomerData>(field: K, value: CustomerData[K]) => {
    setCustomerData((prev) => ({ ...prev, [field]: value }));
  };

  const updateManagerData = <K extends keyof CustomerData['manager']>(
    field: K,
    value: CustomerData['manager'][K],
  ) => {
    setCustomerData((prev) => ({
      ...prev,
      manager: {
        ...prev.manager,
        [field]: value,
      },
    }));
  };

  // 생성이라 낙관적 업데이트를 하지 않는다(결정 7). 무효화는 sales.mutations.ts 한 곳.
  const { mutate: createCustomer, isPending } = useCreateCustomer({
    onSuccess: () => {
      toast.success('고객이 성공적으로 등록되었습니다.');
      onClose();
    },
    onError: (error) => toast.error(`고객 등록 중 오류가 발생했습니다. ${errorMessageOf(error)}`),
  });

  return (
    <>
      {/* 고객 등록 모달 */}

      <form onSubmit={handleCustomerSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={`${fieldId}-field0`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                회사명 *
              </label>
              <input
                id={`${fieldId}-field0`}
                type="text"
                value={customerData.companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateCustomerData('companyName', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="회사명을 입력하세요"
                required
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field1`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                사업자등록번호
              </label>
              <input
                id={`${fieldId}-field1`}
                type="text"
                value={customerData.businessNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateCustomerData('businessNumber', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="000-00-00000"
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-field2`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                대표자명
              </label>
              <input
                id={`${fieldId}-field2`}
                type="text"
                value={customerData.ceoName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateCustomerData('ceoName', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="대표자명을 입력하세요"
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field3`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                전화번호 *
              </label>
              <input
                id={`${fieldId}-field3`}
                type="tel"
                value={customerData.contactPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateCustomerData('contactPhone', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="02-0000-0000"
                required
              />
            </div>
          </div>
        </div>

        {/* 담당자 정보 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">담당자 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={`${fieldId}-field4`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                담당자명 *
              </label>
              <input
                id={`${fieldId}-field4`}
                type="text"
                value={customerData.manager.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateManagerData('name', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="담당자명을 입력하세요"
                required
              />
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-field5`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                휴대폰
              </label>
              <input
                id={`${fieldId}-field5`}
                type="tel"
                value={customerData.manager.mobile}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateManagerData('mobile', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field6`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                이메일 *
              </label>
              <input
                id={`${fieldId}-field6`}
                type="email"
                value={customerData.manager.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateManagerData('email', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@company.com"
                required
              />
            </div>
          </div>
        </div>

        {/* 주소 정보 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">주소 정보</h4>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor={`${fieldId}-field7`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  우편번호
                </label>
                <input
                  id={`${fieldId}-field7`}
                  type="text"
                  value={customerData.zipCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateCustomerData('zipCode', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="00000"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field8`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                주소
              </label>
              <input
                id={`${fieldId}-field8`}
                type="text"
                value={customerData.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateCustomerData('address', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="기본 주소를 입력하세요"
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field9`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                상세주소
              </label>
              <input
                id={`${fieldId}-field9`}
                type="text"
                value={customerData.detailAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateCustomerData('detailAddress', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="상세 주소를 입력하세요"
              />
            </div>
          </div>
        </div>

        {/* 비고 */}
        <div>
          <label
            htmlFor={`${fieldId}-field10`}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            비고
          </label>
          <textarea
            id={`${fieldId}-field10`}
            value={customerData.note}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              updateCustomerData('note', e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="고객에 대한 추가 정보나 특이사항을 입력하세요"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCustomerCancle}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer whitespace-nowrap"
          >
            취소
          </button>
          <Button
            type="submit"
            disabled={isPending}
            label={isPending ? '등록 중...' : '고객 등록'}
          />
        </div>
      </form>
    </>
  );
};

export default NewCustomerModal;
