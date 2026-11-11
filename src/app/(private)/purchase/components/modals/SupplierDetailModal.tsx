'use client';

import StatusLabel from '@/app/components/common/StatusLabel';

import { type SupplierDetail } from '@/app/(private)/purchase/types/SupplierType';
import { useQuery } from '@tanstack/react-query';
import { fetchSupplierDetail } from '@/app/(private)/purchase/api/purchase.api';
import { ModalStatusBox } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { Button } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import SupplierFormModal from '@/app/(private)/purchase/components/modals/SupplierFormModal';
import { supplierKeys } from '@/app/(private)/purchase/api/purchase.keys';
import { useTranslations } from 'next-intl';
import { useSupplierCategoryLabels } from '@/app/(private)/purchase/supplierCategory';

interface SupplierDetailModalProps extends ModalProps {
  supplierId: string;
}

export default function SupplierDetailModal({ supplierId, onClose }: SupplierDetailModalProps) {
  const { openModal } = useModal();
  const t = useTranslations('purchase.supplierDetail');
  const tc = useTranslations('purchase.common');
  const { categoryLabel } = useSupplierCategoryLabels();

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

  if (isLoading) return <ModalStatusBox type="loading" message={t('loading')} />;

  if (isError || !supplier) return <ModalStatusBox type="error" message={t('loadError')} />;

  return (
    <>
      {/* 기본 정보 */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('basicInfo')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('supplierNumber')}</p>
              <p className="text-base font-medium text-gray-900">{supplierInfo?.supplierNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('name')}</p>
              <p className="text-base font-medium text-gray-900">{supplierInfo?.supplierName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('category')}</p>
              <p className="text-base font-medium text-gray-900">
                {supplierInfo && categoryLabel(supplierInfo.category)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('status')}</p>
              <StatusLabel statusCode={supplierInfo?.supplierStatusCode} />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('email')}</p>
              <p className="text-base font-medium text-gray-900">{supplierInfo?.supplierEmail}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('phone')}</p>
              <p className="text-base font-medium text-gray-900">{supplierInfo?.supplierPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('address')}</p>
              <p className="text-base font-medium text-gray-900">
                {supplierInfo?.supplierBaseAddress} {supplierInfo?.supplierDetailAddress}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('leadTime')}</p>
              <p className="text-base font-medium text-gray-900">
                {tc('days', { days: supplier.supplierInfo.deliveryLeadTime })}
              </p>
            </div>
          </div>
        </div>

        {/* 담당자 정보 */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('managerInfo')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('managerName')}</p>
              <p className="text-base font-medium text-gray-900">{managerInfo?.managerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('managerPhone')}</p>
              <p className="text-base font-medium text-gray-900">{managerInfo?.managerPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('managerEmail')}</p>
              <p className="text-base font-medium text-gray-900 break-all">
                {managerInfo?.managerEmail}
              </p>
            </div>
          </div>
        </div>

        {/* 수정 버튼 */}
        <div className="flex justify-end pt-4">
          <Button label={tc('edit')} onClick={handleEdit} icon="ri-edit-line" />
        </div>
      </div>
    </>
  );
}
