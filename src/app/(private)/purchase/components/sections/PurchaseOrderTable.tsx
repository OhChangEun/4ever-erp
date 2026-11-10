import React from 'react';

import { type PurchaseOrderListItem } from '@/app/(private)/purchase/types/PurchaseOrderType';
import { useRole } from '@/app/hooks/useRole';
import { formatDateTime } from '@/app/utils/date';
import { Button } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { Table, type TableColumn } from '@everp/ui';

import { formatCurrency } from '@/app/utils/number';
export interface PurchaseOrderTableProps {
  orders: PurchaseOrderListItem[];
  onViewDetail: (purchaseOrderId: string) => void;
  onApprove: (purchaseOrderId: string) => void;
  onReject: (purchaseOrderId: string) => void;
  onStartDelivery: (purchaseOrderId: string) => void;
  /** 승인, 반려, 배송 시작 중 하나가 진행 중이면 행 버튼 전부 잠근다(중복 제출 방지) */
  actionsDisabled?: boolean;
  /** 이전 페이지 데이터를 보이는 중 */
  isStale?: boolean;
  className?: string;
}

export default function PurchaseOrderTable({
  orders,
  onViewDetail,
  onApprove,
  onReject,
  onStartDelivery,
  actionsDisabled = false,
  isStale = false,
  className,
}: PurchaseOrderTableProps) {
  const role = useRole();
  const isSupplier = role === 'SUPPLIER_ADMIN';

  const columns: TableColumn<PurchaseOrderListItem>[] = [
    {
      key: 'purchaseOrderNumber',
      label: '발주번호',
      width: '140px',
      render: (_, order) => <span className="font-mono text-xs">{order.purchaseOrderNumber}</span>,
    },
    { key: 'supplierName', label: '공급업체' },
    {
      key: 'itemsSummary',
      label: '주문품목',
      render: (_, order) => (
        <span className="block truncate text-gray-600" title={order.itemsSummary}>
          {order.itemsSummary}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: '총금액',
      align: 'right',
      width: '130px',
      render: (_, order) => formatCurrency(Number(order.totalAmount)),
    },
    {
      key: 'orderDate',
      label: '주문일자',
      width: '150px',
      render: (_, order) => (
        <span className="text-gray-600">{formatDateTime(order.orderDate)}</span>
      ),
    },
    {
      key: 'dueDate',
      label: '납기일',
      width: '150px',
      render: (_, order) => <span className="text-gray-600">{formatDateTime(order.dueDate)}</span>,
    },
    {
      key: 'statusCode',
      label: '상태',
      width: '96px',
      render: (_, order) => <StatusLabel statusCode={order.statusCode} />,
    },
    {
      key: 'action',
      label: '작업',
      align: 'right',
      width: isSupplier ? '200px' : '80px',
      render: (_, order) => (
        <div className="flex items-center justify-end gap-0.5 -my-1">
          <Button
            label="상세"
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100 px-2"
            onClick={() => onViewDetail(order.purchaseOrderId)}
          />
          {isSupplier && order.statusCode === 'PENDING' && (
            <>
              <Button
                label="승인"
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => onApprove(order.purchaseOrderId)}
                disabled={actionsDisabled}
              />
              <Button
                label="반려"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 px-2"
                onClick={() => onReject(order.purchaseOrderId)}
                disabled={actionsDisabled}
              />
            </>
          )}
          {isSupplier && order.statusCode === 'APPROVAL' && (
            <Button
              label="배송 시작"
              variant="ghost"
              size="sm"
              className="px-2"
              onClick={() => onStartDelivery(order.purchaseOrderId)}
              disabled={actionsDisabled}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <Table
      isStale={isStale}
      className={className}
      columns={columns}
      data={orders}
      keyExtractor={(row) => row.purchaseOrderId}
      emptyMessage="발주서가 없습니다."
    />
  );
}
