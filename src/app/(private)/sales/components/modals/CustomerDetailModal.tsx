'use client';

import { type CustomerDetailModalProps } from '@/app/(private)/sales/types/CustomerDetailModalProps';
import { type CustomerDetail } from '@/app/(private)/sales/types/SalesCustomerDetailType';
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
import { useTranslations } from 'next-intl';
const CustomerDetailModal = ({ selectedCustomerId }: CustomerDetailModalProps) => {
  const { openModal } = useModal();
  const t = useTranslations('sales.customerDetail');
  const tc = useTranslations('sales.common');
  const {
    data: customer,
    isLoading,
    isError,
  } = useQuery<CustomerDetail>({
    queryKey: customerKeys.detail(selectedCustomerId),
    meta: { listOnNotFound: customerKeys.lists() },
    queryFn: () => getCustomerDetail(selectedCustomerId),
    enabled: !!selectedCustomerId,
  });
  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading) return <ModalStatusBox type="loading" message={t('loading')} />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox type="error" message={t('loadError')} onClose={() => errorDialog.dismiss()} />
    );

  // 오류 창을 닫았거나 데이터가 없으면 내용 대신 안내. 예전엔 `!` 로 단언해 여기서 화면이 깨졌다
  if (!customer) return <ModalStatusBox type="error" message={t('notFound')} />;

  return (
    <>
      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('customerNumber')}
              </label>
              <div className="text-lg font-semibold text-gray-900">{customer.customerNumber}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('ceo')}</label>
              <div className="text-gray-900">{customer.ceoName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('status')}</label>
              <StatusLabel statusCode={customer.statusCode} />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('customerName')}
              </label>
              <div className="text-gray-900">{customer.customerName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('businessNumber')}
              </label>
              <div className="text-gray-900">{customer.businessNumber}</div>
            </div>
          </div>
        </div>

        {/* 연락처 정보 */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('contactTitle')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
                <div className="flex items-center space-x-2">
                  <i className="ri-phone-line text-green-600 mb-1"></i>
                  <span className="text-gray-900">{customer.customerPhone}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                <div className="text-blue-600">{customer.customerEmail}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('address')}
                </label>
                <div className="text-gray-900">
                  {customer.baseAddress} {customer.detailAddress}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 담당자 정보 */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('managerTitle')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('managerName')}
                </label>
                <div className="text-gray-900">{customer.manager.managerName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                <div className="text-blue-600">{customer.manager.managerEmail}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('mobile')}
                </label>
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
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('dealTitle')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('totalOrders')}
                </label>
                <div className="text-gray-900">
                  {tc('orderCount', { count: customer.totalOrders })}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('totalAmount')}
                </label>
                <div className="text-green-600 font-semibold">
                  {formatCurrency(customer.totalTransactionAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 비고 */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">{tc('note')}</label>
          <div className="text-gray-900 bg-gray-50 p-3 rounded-lg">{customer.note}</div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-6 border-t border-gray-200 flex justify-end">
          <Button
            label={t('edit')}
            onClick={() => {
              openModal(CustomerEditModal, {
                width: '900px',
                title: t('editModalTitle'),
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
