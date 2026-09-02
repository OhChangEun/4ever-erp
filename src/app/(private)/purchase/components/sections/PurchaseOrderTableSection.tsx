import React from 'react';

import { PurchaseOrder } from '@/app/(private)/purchase/types/PurchaseOrderType';
import { useRole } from '@/app/hooks/useRole';
import { formatDateTime } from '@/app/utils/date';
import IconButton from '@/app/components/common/IconButton';
import StatusLabel from '@/app/components/common/StatusLabel';
import Table, { TableColumn } from '@/app/components/common/Table';

export interface PurchaseOrderTableProps {
  currentOrders: PurchaseOrder[];
  handleViewDetail: (orderId: string) => void;
  handleApprove: (orderId: string) => void;
  handleReject: (orderId: string) => void;
  handleDelivery: (orderId: string) => void;
  className?: string;
}

export default function PurchaseOrderTable({
  currentOrders,
  handleViewDetail,
  handleApprove,
  handleReject,
  handleDelivery,
  className,
}: PurchaseOrderTableProps) {
  const role = useRole();
  const isSupplier = role === 'SUPPLIER_ADMIN';

  const columns: TableColumn<PurchaseOrder>[] = [
    { key: 'purchaseOrderNumber', label: '발주번호', align: 'center' },
    { key: 'supplierName', label: '공급업체', align: 'center' },
    {
      key: 'itemsSummary',
      label: '주문품목',
      align: 'center',
      render: (_, order) => <span className="max-w-xs truncate block">{order.itemsSummary}</span>,
    },
    { key: 'totalAmount', label: '총금액', align: 'center' },
    {
      key: 'orderDate',
      label: '주문일자',
      align: 'center',
      render: (_, order) => formatDateTime(order.orderDate),
    },
    {
      key: 'dueDate',
      label: '납기일',
      align: 'center',
      render: (_, order) => formatDateTime(order.dueDate),
    },
    {
      key: 'statusCode',
      label: '상태',
      align: 'center',
      render: (_, order) => <StatusLabel statusCode={order.statusCode} />,
    },
    {
      key: 'action',
      label: '작업',
      align: 'center',
      render: (_, order) => (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handleViewDetail(order.purchaseOrderId)}
            className="text-blue-600 hover:text-blue-500 cursor-pointer"
            title="상세보기"
          >
            <i className="ri-eye-line"></i>
          </button>
          {isSupplier && order.statusCode === 'PENDING' && (
            <>
              <button
                onClick={() => handleApprove(order.purchaseOrderId)}
                className="text-green-600 hover:text-green-900 cursor-pointer"
                title="승인"
              >
                <i className="ri-check-line"></i>
              </button>
              <button
                onClick={() => handleReject(order.purchaseOrderId)}
                className="text-red-600 hover:text-red-900 cursor-pointer"
                title="반려"
              >
                <i className="ri-close-line"></i>
              </button>
            </>
          )}
          {isSupplier && order.statusCode === 'APPROVAL' && (
            <IconButton
              size="sm"
              variant="soft"
              icon="ri-truck-line"
              onClick={() => handleDelivery(order.purchaseOrderId)}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <Table
      className={className}
      columns={columns}
      data={currentOrders}
      keyExtractor={(row) => row.purchaseOrderId}
      emptyMessage="발주서가 없습니다."
    />
  );
}
