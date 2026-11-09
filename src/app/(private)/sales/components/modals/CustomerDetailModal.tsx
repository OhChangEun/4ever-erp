'use client';

import { CustomerDetailModalProps } from '@/app/(private)/sales/types/CustomerDetailModalProps';
import { CustomerDetail } from '@/app/(private)/sales/types/SalesCustomerDetailType';
import { getCustomerDetail } from '../../sales.api';
import { customerKeys } from '@/app/(private)/sales/sales.keys';
import { useQuery } from '@tanstack/react-query';
import { ModalStatusBox } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Button } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import CustomerEditModal from './CustomerEditModal';

import { formatCurrency } from '@/app/utils/number';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
const CustomerDetailModal = ({ selectedCustomerId }: CustomerDetailModalProps) => {
  const { openModal } = useModal();
  const {
    data: customer,
    isLoading,
    isError,
  } = useQuery<CustomerDetail>({
    queryKey: customerKeys.detail(selectedCustomerId),
    queryFn: () => getCustomerDetail(selectedCustomerId),
    enabled: !!selectedCustomerId,
  });
  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading)
    return <ModalStatusBox type="loading" message="고객 상세 데이터를 불러오는 중입니다..." />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox
        type="error"
        message="고객 상세 데이터를 불러오는 중 오류가 발생했습니다."
        onClose={() => errorDialog.dismiss()}
      />
    );

  // 오류 창을 닫았거나 데이터가 없으면 내용 대신 안내. 예전엔 `!` 로 단언해 여기서 화면이 깨졌다
  if (!customer)
    return <ModalStatusBox type="error" message="고객 상세 데이터를 불러오지 못했습니다." />;

  return (
    <>
      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">고객코드</label>
              <div className="text-lg font-semibold text-gray-900">{customer.customerNumber}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대표이사</label>
              <div className="text-gray-900">{customer.ceoName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <StatusLabel statusCode={customer.statusCode} />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">고객명</label>
              <div className="text-gray-900">{customer.customerName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사업자번호</label>
              <div className="text-gray-900">{customer.businessNumber}</div>
            </div>
          </div>
        </div>

        {/* 연락처 정보 */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">연락처 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대표전화</label>
                <div className="flex items-center space-x-2">
                  <i className="ri-phone-line text-green-600 mb-1"></i>
                  <span className="text-gray-900">{customer.customerPhone}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <div className="text-blue-600">{customer.customerEmail}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <div className="text-gray-900">
                  {customer.baseAddress} {customer.detailAddress}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 담당자 정보 */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">담당자 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">담당자명</label>
                <div className="text-gray-900">{customer.manager.managerName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <div className="text-blue-600">{customer.manager.managerEmail}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰</label>
                <div className="flex items-center space-x-2">
                  <i className="ri-phone-line text-green-600 mb-1"></i>
                  <span className="text-gray-900">{customer.manager.managerPhone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 거래 정보 */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">거래 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">총 주문건수</label>
                <div className="text-gray-900">{customer.totalOrders}건</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">총 거래금액</label>
                <div className="text-green-600 font-semibold">
                  {formatCurrency(customer.totalTransactionAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 비고 */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
          <div className="text-gray-900 bg-gray-50 p-3 rounded-lg">{customer.note}</div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-6 border-t border-gray-200 flex justify-end">
          <Button
            label="수정"
            onClick={() => {
              openModal(CustomerEditModal, {
                width: '900px',
                title: '고객 정보 수정',
                editFormData: customer,
              });
            }}
          />
        </div>
      </div>
    </>
  );
};

export default CustomerDetailModal;
