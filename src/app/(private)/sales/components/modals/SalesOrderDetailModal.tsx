'use client';
import {
  type OrderDetail,
  type SalesOrderDetailProps,
} from '@/app/(private)/sales/types/SalesOrderDetailType';
import { useQuery } from '@tanstack/react-query';
import { getOrderDetail } from '@/app/(private)/sales/sales.api';
import { salesOrderKeys } from '@/app/(private)/sales/sales.keys';
import { ModalStatusBox } from '@everp/ui';
import { ITEM_TABLE_HEADERS } from '@/app/(private)/sales/constant';
import StatusLabel from '@/app/components/common/StatusLabel';

import { formatCurrency } from '@/app/utils/number';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';
import { useTranslations } from 'next-intl';
import { useSalesLabels } from '@/app/(private)/sales/sales.labels';
const SalesOrderDetailModal = ({ selectedSalesOrderId }: SalesOrderDetailProps) => {
  const t = useTranslations('sales.orderDetail');
  const tc = useTranslations('sales.common');
  const { uomLabel } = useSalesLabels();
  const {
    data: orderDetailRes,
    isLoading,
    isError,
  } = useQuery<OrderDetail>({
    queryKey: salesOrderKeys.detail(selectedSalesOrderId),
    meta: { listOnNotFound: salesOrderKeys.lists() },
    queryFn: () => getOrderDetail(selectedSalesOrderId),
    enabled: !!selectedSalesOrderId,
  });
  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  if (isLoading) return <ModalStatusBox type="loading" message={t('loading')} />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox type="error" message={t('loadError')} onClose={() => errorDialog.dismiss()} />
    );

  const order = orderDetailRes?.order;
  const customer = orderDetailRes?.customer;
  const items = orderDetailRes?.items;

  // 오류 창을 닫았거나 데이터가 없으면 내용 대신 안내. 예전엔 `!` 로 단언해 여기서 화면이 깨졌다
  if (!orderDetailRes || !order) return <ModalStatusBox type="error" message={t('notFound')} />;

  return (
    <>
      <>
        {/* 모달 내용 */}
        <div className="p-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orderTitle')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('number')}</label>
                  <p className="text-sm text-gray-900">{order.salesOrderNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('orderDate')}</label>
                  <p className="text-sm text-gray-900">{order.orderDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('dueDate')}</label>
                  <p className="text-sm text-gray-900">{order.dueDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('status')}</label>
                  <StatusLabel statusCode={order.statusCode} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('customerTitle')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('companyName')}</label>
                  <p className="text-sm text-gray-900">{customer?.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('manager')}</label>
                  <p className="text-sm text-gray-900">{customer?.manager.managerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('contact')}</label>
                  <p className="text-sm text-gray-900">{customer?.manager.managerPhone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('email')}</label>
                  <p className="text-sm text-gray-900">{customer?.manager.managerEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('address')}</label>
                  <p className="text-sm text-gray-900">
                    {customer?.customerBaseAddress} {customer?.customerDetailAddress}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 주문 품목 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('itemsTitle')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    {ITEM_TABLE_HEADERS.map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b"
                      >
                        {tc(`itemColumns.${header}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items?.map((item, index) => (
                    <tr key={`${item.itemName}-${index}`}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.itemName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{uomLabel(item.uonName)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-sm font-medium text-gray-900 text-right"
                    >
                      {t('total')}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 특이사항 */}
          {orderDetailRes.note && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('noteTitle')}</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{orderDetailRes.note}</p>
              </div>
            </div>
          )}
        </div>
      </>
    </>
  );
};

export default SalesOrderDetailModal;
