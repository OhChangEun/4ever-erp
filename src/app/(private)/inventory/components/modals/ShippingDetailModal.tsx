'use client';

import { useQuery } from '@tanstack/react-query';
import {
  OrderItemsType,
  ShippingDetailModalProps,
  ShippingDetailResponse,
} from '../../types/ShippingDetailModalType';
import { ModalStatusBox } from '@everp/ui';
import { getProductionDetail, getReadyToShipDetail } from '../../inventory.api';
import { useMarkReadyToShip } from '../../inventory.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { useToast } from '@/app/components/common/toast/useToast';
import { shippingKeys } from '@/app/(private)/inventory/inventory.keys';
import { useDismissibleError } from '@/app/hooks/useDismissibleError';

const ShippingDetailModal = ({
  onClose,
  selectedSubTab,
  selectedOrderId,
}: ShippingDetailModalProps) => {
  const toast = useToast();
  const getShippingDetailBySubTab = (subTab: string, id: string) => {
    switch (subTab) {
      case 'producing':
        return getProductionDetail(id);
      case 'readyToShip':
        return getReadyToShipDetail(id);
      default:
        return getProductionDetail(id);
    }
  };

  const {
    data: shippingDetailRes,
    isLoading,
    isError,
  } = useQuery<ShippingDetailResponse>({
    queryKey: shippingKeys.detail(selectedOrderId),
    queryFn: () => getShippingDetailBySubTab(selectedSubTab, selectedOrderId),
    enabled: !!selectedOrderId,
  });

  // 조회 오류 창. 닫으면 닫히고, 오류가 풀렸다 다시 나면 다시 열린다
  const errorDialog = useDismissibleError(isError);

  // 무효화(출하 목록, 재고 통계, 영업 주문)는 inventory.mutations.ts 한 곳
  const { mutate: markAsReadyToShip, isPending } = useMarkReadyToShip({
    onSuccess: () => {
      toast.success('출고 준비 완료로 상태가 변경되었습니다.');
      onClose();
    },
    onError: (error) => toast.error(`상태 변경 중 오류가 발생했습니다. ${errorMessageOf(error)}`),
  });

  if (isLoading)
    return <ModalStatusBox type="loading" message="출고 상세 데이터를 불러오는 중입니다..." />;

  if (errorDialog.isOpen)
    return (
      <ModalStatusBox
        type="error"
        message="출고 상세 데이터를 불러오는 중 오류가 발생했습니다."
        onClose={() => errorDialog.dismiss()}
      />
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <span className="text-sm text-gray-600">고객:</span>
          <div className="font-medium text-gray-900">{shippingDetailRes?.customerCompanyName}</div>
        </div>
        <div>
          <span className="text-sm text-gray-600">납기일:</span>
          <div className="font-medium text-gray-900">{shippingDetailRes?.dueDate.slice(0, 10)}</div>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">주문 품목</h4>
        <div className="space-y-2">
          {shippingDetailRes?.orderItems.map((item: OrderItemsType, index: number) => (
            <div
              key={index}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
            >
              <span className="font-medium text-gray-900">{item.itemName}</span>
              <span className="text-sm text-gray-600">
                {item.quantity} {item.uomName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selectedSubTab !== 'producing' && (
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => onClose()}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
          >
            닫기
          </button>
          <button
            onClick={() => {
              markAsReadyToShip({
                orderId: selectedOrderId,
                itemIds: {
                  itemIds: shippingDetailRes?.orderItems.map((item) => item.itemId) ?? [],
                },
              });
            }}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? '처리 중...' : '배송 시작'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ShippingDetailModal;
