import { Button } from '@everp/ui';
import { ModalProps } from '@/app/components/common/modal/types';
import { useQuery } from '@tanstack/react-query';
import { ModalStatusBox } from '@everp/ui';
import { mrpItemsInfoKeys } from '../../api/production.keys';
import { useCreateStockPurchaseRequest } from '../../api/production.mutations';
import { postItemsInfo } from '../../api/production.api';
import { MrpPlannedOrderList } from '../../types/MrpPlannedOrdersListApiType';
import type { ItemResponse } from '@/app/(private)/inventory';
import { useToast } from '@/app/components/common/toast/useToast';
import { errorMessageOf } from '@/lib/AppError';

import { formatCurrency } from '@/app/utils/number';
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
      toast.success('자재 구매 요청이 완료되었습니다.');
      onConfirm();
      onClose();
    },
    onError: (err) => toast.error(`자재 구매 요청에 실패했습니다. ${errorMessageOf(err)}`),
  });

  // 총 금액 계산
  const totalAmount = editableOrders.reduce((sum, order) => sum + order.totalPrice, 0);

  // 요청할 품목이 없으면 확정 버튼을 보이지 않는다. 빈 구매 요청이 나가면 안 된다(리뷰 A1, R14)
  if (editableOrders.length === 0 && !isLoading && !isError) {
    return (
      <div className="min-w-3xl flex justify-center items-center p-8">
        <div className="text-gray-500">구매 요청할 자재가 없습니다.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-w-3xl flex justify-center items-center p-8">
        <div className="text-gray-500">자재 정보를 불러오는 중...</div>
      </div>
    );
  }

  // 조회가 실패하면 확정 버튼을 보이지 않는다. 빈 표로 구매 요청이 나가면 안 된다(우선순위 2)
  if (isError) {
    return (
      <ModalStatusBox
        type="error"
        message={`자재 정보를 불러오지 못했습니다. ${errorMessageOf(error)}`}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="min-w-3xl">
      {/* 요약 영역 */}
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">구매 요청 요약</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600">선택된 주문:</span>
              <span className="ml-2 font-medium">{editableOrders.length}건</span>
            </div>
            <div>
              <span className="text-blue-600">총 예상 금액:</span>
              <span className="ml-2 font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div>
              <span className="text-blue-600">요청일:</span>
              <span className="ml-2 font-medium">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* 테이블 영역 */}
        <div className="overflow-x-auto overflow-y-auto max-h-[252px] rounded shadow-xs">
          <table className="min-w-full divide-y divide-gray-100 border-b border-gray-100">
            <thead className="sticky top-0 z-local bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  참조 견적서
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  자재
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  수량
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  단가
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총액
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공급사
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
                  <td className="px-4 py-3">{order.quantity.toLocaleString()}</td>
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
          label="구매 요청 확정"
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
