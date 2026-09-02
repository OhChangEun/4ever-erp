import { OrderStatus } from '@/app/(private)/sales/types/SalesOrderListType';
import { ModalProps } from '@/app/components/common/modal/types';

export interface SalesOrderDetailProps extends ModalProps {
  selectedSalesOrderId: string;
}

export interface OrderDetail {
  order: {
    salesOrderId: number;
    salesOrderNumber: string;
    orderDate: string;
    dueDate: string;
    statusCode: OrderStatus;
    totalAmount: number;
  };
  customer: {
    customerId: number;
    customerName: string;
    customerCode: string;
    customerBaseAddress: string;
    customerDetailAddress: string;
    manager: {
      managerName: string;
      managerPhone: string;
      managerEmail: string;
    };
  };
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    uonName: string;
    unitPrice: number;
    amount: number;
  }[];
  note: string;
}
