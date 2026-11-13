'use client';

import { useTranslations } from 'next-intl';
import { getInvoiceTypeKey } from '@/app/(private)/finance/utils';
import { VOUCHER_DETAIL_TABLE_HEADERS } from '@/app/(private)/finance/constants';
import {
  type InvoiceDetailModalProps,
  type InvoicetDetailRes,
} from '@/app/(private)/finance/types/InvoiceDetailModalType';
import { ModalStatusBox } from '@everp/ui';
import { useQuery } from '@tanstack/react-query';
import { getPurchaseInvoiceDetail, getSalesInvoiceDetail } from '../../finance.api';
import { invoiceKeys } from '@/app/(private)/finance/finance.keys';
import { useSearchParams } from 'next/navigation';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useRole } from '@/app/hooks/useRole';

import { formatCurrency } from '@/app/utils/number';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
const InvoiceDetailModal = ({ onClose, selectedInvoiceId }: InvoiceDetailModalProps) => {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'sales';
  const role = useRole();
  const t = useTranslations('finance.invoiceDetail');
  const tType = useTranslations('finance.invoiceType');

  // const queryFn =
  //   currentTab === 'sales'
  //     ? () => getSalesInvoiceDetail(selectedInvoiceId)
  //     : () => {
  //         return getPurchaseInvoiceDetail(selectedInvoiceId);
  //       };

  const queryFn =
    currentTab === 'sales'
      ? role === 'SUPPLIER_ADMIN'
        ? () => getPurchaseInvoiceDetail(selectedInvoiceId)
        : () => getSalesInvoiceDetail(selectedInvoiceId)
      : role === 'SUPPLIER_ADMIN'
        ? () => getSalesInvoiceDetail(selectedInvoiceId)
        : () => getPurchaseInvoiceDetail(selectedInvoiceId);

  const {
    data: invoiceRes,
    isLoading,
    isError,
  } = useQuery<InvoicetDetailRes>({
    queryKey: invoiceKeys.detail(selectedInvoiceId),
    meta: { listOnNotFound: invoiceKeys.lists() },
    queryFn: queryFn,
    enabled: !!selectedInvoiceId,
  });

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading) return <ModalStatusBox type="loading" message={t('loading')} />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox type="error" message={t('loadError')} onClose={() => errorDialog.dismiss()} />
    );

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('invoiceNumber')}
            </label>
            <div className="text-lg font-semibold text-gray-900">{invoiceRes?.invoiceNumber}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('invoiceType')}
            </label>
            <div className="text-gray-900">
              {tType(getInvoiceTypeKey(invoiceRes?.invoiceType ?? 'AR'))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('connection')}
            </label>
            <div className="text-gray-900">{invoiceRes?.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('note')}</label>
            <div className="text-gray-900">{invoiceRes?.note}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('referenceNumber')}
            </label>
            <div className="text-gray-900">{invoiceRes?.referenceNumber}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('issueDate')}</label>
            <div className="text-gray-900">{invoiceRes?.issueDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dueDate')}</label>
            <div className="text-gray-900">{invoiceRes?.dueDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('status')}</label>
            <StatusLabel statusCode={invoiceRes?.statusCode} />
          </div>
        </div>
      </div>

      {/* 주문 품목 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">{t('items')}</label>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                {VOUCHER_DETAIL_TABLE_HEADERS.map((header) => (
                  <th
                    key={header}
                    className={`px-4 py-3 text-sm font-medium text-gray-700 border-b ${
                      header === 'itemName'
                        ? 'text-left'
                        : header === 'quantity' || header === 'unit'
                          ? 'text-center'
                          : 'text-right'
                    }`}
                  >
                    {t(`columns.${header}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoiceRes?.items.map((item, index: number) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.itemName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">
                    {item.unitOfMaterialName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right font-medium text-gray-900">
                  {t('total')}
                </td>
                <td className="px-4 py-3 text-right font-medium text-green-600">
                  {formatCurrency(invoiceRes?.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 pt-6 border-t border-gray-200">
        <button
          onClick={() => {
            onClose();
          }}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
