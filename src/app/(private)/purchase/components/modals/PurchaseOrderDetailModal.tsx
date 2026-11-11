'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPurchaseOrderDetail } from '@/app/(private)/purchase/api/purchase.api';
import { type PurchaseOrderDetail } from '@/app/(private)/purchase/types/PurchaseOrderType';
import { ModalStatusBox } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import StatusLabel from '@/app/components/common/StatusLabel';
import { formatDateTime } from '@/app/utils/date';
import { purchaseOrderKeys } from '@/app/(private)/purchase/api/purchase.keys';

import { formatCurrency, formatNumber } from '@/app/utils/number';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
import { useTranslations } from 'next-intl';
export interface PurchaseOrderDetailModalProps extends ModalProps {
  purchaseOrderId: string;
}

export default function PurchaseOrderDetailModal({
  purchaseOrderId,
}: PurchaseOrderDetailModalProps) {
  const t = useTranslations('purchase.orderDetail');
  const {
    data: order,
    isLoading,
    isError,
  } = useQuery<PurchaseOrderDetail>({
    queryKey: purchaseOrderKeys.detail(purchaseOrderId),
    queryFn: () => fetchPurchaseOrderDetail(purchaseOrderId),
  });

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading) return <ModalStatusBox type="loading" message={t('loading')} />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox type="error" message={t('loadError')} onClose={() => errorDialog.dismiss()} />
    );

  // 불러오는 중, 실패를 먼저 보인다. 예전엔 이 검사가 위에 있어 로딩과 오류 상자가 뜨지 않고 빈 화면이었다
  if (!order) return null;

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('number')}</label>
            <div className="text-lg font-semibold text-gray-900">{order.purchaseOrderNumber}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplier')}</label>
            <div className="text-gray-900">{order.supplierNumber}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
            <div className="text-gray-900">{order.managerPhone}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <div className="text-blue-600">{order.managerEmail}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderDate')}</label>
            <div className="text-gray-900">{formatDateTime(order.orderDate)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dueDate')}</label>
            <div className="text-gray-900">{formatDateTime(order.dueDate)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('status')}</label>
            <StatusLabel statusCode={order.statusCode} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('totalAmount')}
            </label>
            <div className="text-lg font-semibold text-green-600">{order.totalAmount}</div>
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
                <th className="px-4 py-3 text-sm font-medium text-gray-700">
                  {t('columns.itemName')}
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">
                  {t('columns.quantity')}
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">{t('columns.unit')}</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">
                  {t('columns.unitPrice')}
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">
                  {t('columns.amount')}
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200 text-center">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.itemName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatNumber(item.quantity)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.uomName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 text-right">
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right font-medium">
                  <span className="pr-6 text-sm text-gray-900">{t('totalAmount')}</span>
                  <span className="text-3xl text-green-600">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('note')}</label>
        <div className="text-gray-900 bg-gray-50 p-3 rounded-lg">{order.note}</div>
      </div>
    </div>
  );
}
