'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPurchaseOrderDetail } from '@/app/(private)/purchase/api/purchase.api';
import { PurchaseOrderDetailResponse } from '@/app/(private)/purchase/types/PurchaseOrderType';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import { useEffect, useState } from 'react';
import { ModalProps } from '@/app/components/common/modal/types';
import StatusLabel from '@/app/components/common/StatusLabel';
import { formatDateTime } from '@/app/utils/date';

export interface PurchaseOrderDetailModalProps extends ModalProps {
  purchaseId: string;
}

export default function PurchaseOrderDetailModal({ purchaseId }: PurchaseOrderDetailModalProps) {
  const {
    data: order,
    isLoading,
    isError,
  } = useQuery<PurchaseOrderDetailResponse>({
    queryKey: ['purchaseOrderDetail'],
    queryFn: () => fetchPurchaseOrderDetail(purchaseId),
  });

  const [errorModal, setErrorModal] = useState(false);
  useEffect(() => {
    setErrorModal(isError);
  }, [isError]);

  if (!order) return null;

  if (isLoading)
    return <ModalStatusBox type="loading" message="발주서 상세정보를 불러오는 중입니다..." />;

  if (errorModal)
    return (
      <ModalStatusBox
        type="error"
        message="발주서 데이터를 불러오는 중 오류가 발생했습니다."
        onClose={() => setErrorModal(false)}
      />
    );

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">발주번호</label>
            <div className="text-lg font-semibold text-gray-900">{order.purchaseOrderNumber}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">공급업체</label>
            <div className="text-gray-900">{order.supplierNumber}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <div className="text-gray-900">{order.managerPhone}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <div className="text-blue-600">{order.managerEmail}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">주문일자</label>
            <div className="text-gray-900">{formatDateTime(order.orderDate)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">납기일</label>
            <div className="text-gray-900">{formatDateTime(order.dueDate)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <StatusLabel statusCode={order.statusCode} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">총 금액</label>
            <div className="text-lg font-semibold text-green-600">{order.totalAmount}</div>
          </div>
        </div>
      </div>

      {/* 주문 품목 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">주문 품목</label>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">품목명</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">수량</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">단위</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">단가</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">금액</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200 text-center">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.itemName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.uomName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    ₩{item.unitPrice.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 text-right">
                    ₩{item.totalPrice.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right font-medium">
                  <span className="pr-6 text-sm text-gray-900">총 금액</span>
                  <span className="text-3xl text-green-600">
                    {order.totalAmount.toLocaleString()}원
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
        <div className="text-gray-900 bg-gray-50 p-3 rounded-lg">{order.note}</div>
      </div>
    </div>
  );
}
