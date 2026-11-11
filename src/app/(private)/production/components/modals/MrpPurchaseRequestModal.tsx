import { Button } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';
import { useQuery } from '@tanstack/react-query';
import { ModalStatusBox } from '@everp/ui';
import { mrpItemsInfoKeys } from '../../api/production.keys';
import { useCreateStockPurchaseRequest } from '../../api/production.mutations';
import { postItemsInfo } from '../../api/production.api';
import { type MrpPlannedOrderList } from '../../types/MrpPlannedOrdersListApiType';
import type { ItemResponse } from '@/app/(private)/inventory';
import { useToast } from '@/app/components/common/toast/useToast';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { useLocale, useTranslations } from 'next-intl';

import { formatCurrency, formatNumber } from '@/app/utils/number';
interface ItemWithQuantity extends ItemResponse {
  quantity: number;
  totalPrice: number;
  mrpRunId: string;
  quotationNumber: string;
}

interface PurchaseRequestModalProps extends ModalProps {
  orders: MrpPlannedOrderList[];
  onConfirm: () => void;
}

export default function MrpPurchaseRequestModal({
  orders,
  onConfirm,
  onClose,
}: PurchaseRequestModalProps) {
  const t = useTranslations('production');
  // 브라우저 언어가 아니라 앱 언어로 날짜를 쓴다(en-GB 브라우저면 월과 일이 바뀌어 읽힌다)
  const locale = useLocale();
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  const itemIds = orders.map((order) => order.itemId);

  // 품목 정보는 읽기라 useQuery. 결과를 state 에 복사하지 않고 아래에서 계산한다(R01, R02)
  const {
    data: items,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: mrpItemsInfoKeys.byIds(itemIds),
    queryFn: () => postItemsInfo(itemIds),
    enabled: itemIds.length > 0,
  });

  const editableOrders: ItemWithQuantity[] = orders.flatMap((order) => {
    const item = items?.find((candidate) => candidate.itemId === order.itemId);
    if (!item) return [];
    return [
      {
        ...item,
        quantity: order.quantity,
        totalPrice: order.quantity * item.unitPrice,
        mrpRunId: order.mrpRunId,
        quotationNumber: order.quotationNumber,
      },
    ];
  });

  // 구매 도메인 데이터를 만드는 요청. 구매 요청 목록과 통계도 훅이 같이 무효화한다.
  const { mutate: createStockPurchase, isPending } = useCreateStockPurchaseRequest({
    onSuccess: () => {
      toast.success(t('purchaseRequest.success'));
      onConfirm();
      onClose();
    },
    onError: (err) => toast.error(t('purchaseRequest.error', { message: errorMessageOf(err) })),
  });

  // 총 금액 계산
  const totalAmount = editableOrders.reduce((sum, order) => sum + order.totalPrice, 0);

  // 요청할 품목이 없으면 확정 버튼을 보이지 않는다. 빈 구매 요청이 나가면 안 된다(리뷰 A1, R14)
  if (editableOrders.length === 0 && !isLoading && !isError) {
    return (
      <div className="min-w-3xl flex justify-center items-center p-8">
        <div className="text-gray-500">{t('purchaseRequest.empty')}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-w-3xl flex justify-center items-center p-8">
        <div className="text-gray-500">{t('purchaseRequest.loading')}</div>
      </div>
    );
  }

  // 조회가 실패하면 확정 버튼을 보이지 않는다. 빈 표로 구매 요청이 나가면 안 된다(우선순위 2)
  if (isError) {
    return (
      <ModalStatusBox
        type="error"
        message={t('purchaseRequest.loadError', { message: errorMessageOf(error) })}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="min-w-3xl">
      {/* 요약 영역 */}
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">{t('purchaseRequest.summary')}</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600">{t('purchaseRequest.selectedOrders')}</span>
              <span className="ml-2 font-medium">
                {t('purchaseRequest.orderCount', { count: editableOrders.length })}
              </span>
            </div>
            <div>
              <span className="text-blue-600">{t('purchaseRequest.totalAmount')}</span>
              <span className="ml-2 font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div>
              <span className="text-blue-600">{t('purchaseRequest.requestDate')}</span>
              <span className="ml-2 font-medium">{new Date().toLocaleDateString(locale)}</span>
            </div>
          </div>
        </div>

        {/* 테이블 영역 */}
        <div className="overflow-x-auto overflow-y-auto max-h-[252px] rounded shadow-xs">
          <table className="min-w-full divide-y divide-gray-100 border-b border-gray-100">
            <thead className="sticky top-0 z-local bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.referenceQuote')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.material')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.quantity')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.unitPrice')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('purchaseRequest.total')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.supplier')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-center">
              {editableOrders.map((order) => (
                <tr key={order.itemId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">
                    {order.quotationNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.itemName}</td>
                  <td className="px-4 py-3">{formatNumber(order.quantity)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatCurrency(order.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(order.totalPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.supplierName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex justify-end pt-2 pb-6">
        <Button
          label={t('purchaseRequest.confirm')}
          onClick={() =>
            createStockPurchase({
              items: editableOrders.map((order) => ({
                productId: order.itemId,
                quantity: order.quantity,
                mrpRunId: order.mrpRunId,
              })),
            })
          }
          disabled={isPending}
        />
      </div>
    </div>
  );
}
