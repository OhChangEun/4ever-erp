'use client';

import { SupplierDetail } from '@/app/(private)/purchase/types/SupplierType';
import { useQuery } from '@tanstack/react-query';
import { fetchSupplierDetail } from '@/app/(private)/purchase/api/purchase.api';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { ModalProps } from '@/app/components/common/modal/types';
import Button from '@/app/components/common/Button';
import { useModal } from '@/app/components/common/modal/useModal';
import SupplierFormModal from '@/app/(private)/purchase/components/modals/SupplierFormModal';
import { supplierKeys } from '@/app/(private)/purchase/api/purchase.keys';

interface SupplierDetailModalProps extends ModalProps {
  supplierId: string;
}

export default function SupplierDetailModal({ supplierId, onClose }: SupplierDetailModalProps) {
  const { openModal } = useModal();

  const {
    data: supplier,
    isLoading,
    isError,
  } = useQuery<SupplierDetail>({
    queryKey: supplierKeys.detail(supplierId),
    queryFn: () => fetchSupplierDetail(supplierId),
  });

  const { supplierInfo, managerInfo } = supplier || {};

  // 수정 버튼 클릭 핸들러
  const handleEdit = () => {
    if (supplier) {
      onClose(); // 현재 상세보기 모달 닫기
      openModal(SupplierFormModal, {
        initialData: supplier, // 기존 데이터 전달
      });
    }
  };

  if (isLoading)
    return <ModalStatusBox type="loading" message="공급업체 상세정보를 불러오는 중입니다..." />;

  if (isError || !supplier)
    return (
      <ModalStatusBox type="error" message="공급업체 상세정보를 불러오는 중 오류가 발생했습니다." />
    );

  return (
    <>
      {/* 기본 정보 */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">업체 ID</p>
              <p className="text-base font-medium text-gray-900">{supplierInfo?.supplierNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">업체명</p>
              <p className="text-base font-medium text-gray-900">{supplierInfo?.supplierName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">카테고리</p>
              <p className="text-base font-medium text-gray-900">{supplierInfo?.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">상태</p>
              <span>{supplierInfo?.supplierStatusCode}</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">이메일</p>
              <p className="text-base font-medium text-gray-900">{supplierInfo?.supplierEmail}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">연락처</p>
              <p className="text-base font-medium text-gray-900">{supplierInfo?.supplierPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">주소</p>
              <p className="text-base font-medium text-gray-900">
                {supplierInfo?.supplierBaseAddress} {supplierInfo?.supplierDetailAddress}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">배송기간</p>
              <p className="text-base font-medium text-gray-900">
                {supplierInfo?.deliveryLeadTime}일
              </p>
            </div>
          </div>
        </div>

        {/* 담당자 정보 */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">담당자 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">담당자명</p>
              <p className="text-base font-medium text-gray-900">{managerInfo?.managerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">담당자 전화번호</p>
              <p className="text-base font-medium text-gray-900">{managerInfo?.managerPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">담당자 이메일</p>
              <p className="text-base font-medium text-gray-900 break-all">
                {managerInfo?.managerEmail}
              </p>
            </div>
          </div>
        </div>

        {/* 수정 버튼 */}
        <div className="flex justify-end pt-4">
          <Button label="수정" onClick={handleEdit} icon="ri-edit-line" />
        </div>
      </div>
    </>
  );
}
