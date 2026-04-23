'use client';

import { useState } from 'react';
import { CustomerData } from '@/app/(private)/sales/types/NewCustomerModalType';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postCustomer } from '@/app/(private)/sales/sales.api';
import { SalesCustomer } from '../../types/SalesCustomerListType';
import { Page } from '@/app/types/Page';
import Button from '@/app/components/common/Button';
import { ModalProps } from '@/app/components/common/modal/types';
import { useToast } from '@/app/components/common/toast/useToast';
const NewCustomerModal = ({ onClose }: ModalProps) => {
  const queryClient = useQueryClient();
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

  const handleCustomerCancle = (e: React.FormEvent) => {
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

  // 낙관적 갱신x
  // const { mutate: createCustomer, isPending } = useMutation({
  //   mutationFn: postCustomer,
  //   onSuccess: (data) => {
  //     alert(`고객이 성공적으로 등록되었습니다.
  //       `);

  //     $onClose();
  //   },
  //   onError: (error) => {
  //     alert(`고객 등록 중 오류가 발생했습니다. ${error}`);
  //   },
  // });

  // 낙관적 갱신
  const { mutate: createCustomer, isPending } = useMutation({
    mutationFn: postCustomer,
    onMutate: async (newCustomer) => {
      await queryClient.cancelQueries({ queryKey: ['customerList'] });
      // 이전 데이터 저장
      const previousData = queryClient.getQueryData<{
        data: { customers: SalesCustomer[]; page: Page };
      }>(['customerList']);
      // 낙관적 업데이트
      queryClient.setQueryData<{ data: { customers: SalesCustomer[]; page: Page } }>(
        ['customerList'],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              customers: [newCustomer as unknown as SalesCustomer, ...oldData.data.customers],
            },
          };
        },
      );

      return { previousData };
    },
    onError: (error, _newCustomer, context) => {
      // error: 오류 객체
      // _newCustomer: 새로 생성하려던 고객 정보
      // context: 이전 캐시 데이터 백업용
      // 에러 시 기존 데이터로 복원
      if (context?.previousData) {
        queryClient.setQueryData(['customerList'], context.previousData);
      }
      toast.error(`고객 등록 중 오류가 발생했습니다. ${error}`);
    },
    onSuccess: () => {
      toast.success('고객이 성공적으로 등록되었습니다.');
      onClose();
    },
    onSettled: () => {
      // 성공,실패 상관없이 서버 데이터로 최신화
      queryClient.invalidateQueries({ queryKey: ['customerList'] });
    },
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
              <label className="block text-sm font-medium text-gray-700 mb-1">회사명 *</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">대표자명</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">전화번호 *</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">담당자명 *</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
              <input
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
                <label className="block text-sm font-medium text-gray-700 mb-1">우편번호</label>
                <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">상세주소</label>
              <input
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
          <label className="block text-sm font-medium text-gray-700 mb-2">비고</label>
          <textarea
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
