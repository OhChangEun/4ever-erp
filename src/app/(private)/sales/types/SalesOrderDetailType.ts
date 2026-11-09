import { OrderStatus } from '@/app/(private)/sales/types/SalesOrderListType';
import { ModalProps } from '@/app/components/common/modal/types';

export interface SalesOrderDetailProps extends ModalProps {
  selectedSalesOrderId: string;
}

export interface OrderDetail {
  order: {
    // 목록(Order.salesOrderId)과 같은 문자열 ID. 예전 타입은 number 였고 서버 목은 문자열을 보냈다
    salesOrderId: string;
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
