import { ModalProps } from '@/app/components/common/modal/types';

export interface ShippingDetailModalProps extends ModalProps {
  selectedSubTab: string;
  selectedOrderId: string;
}

export interface ShippingDetailResponse {
  salesOrderId: string;
  salesOrderNumber: string;
  customerCompanyName: string;
  dueDate: string;
  statusCode: 'IN_PRODUCTION' | 'READY_TO_SHIP' | 'COMPLETED' | string;
  orderItems: {
    itemId: string;
    itemName: string;
    quantity: number;
    uomName: string;
  }[];
}

export interface OrderItemsType {
  itemName: string;
  quantity: number;
  uomName: string;
}

export interface markAsReadyToShipResponse {
  salesOrderId: string;
  salesOrderCode: string;
  status: string;
}

export interface markAsReadyRequest {
  itemIds: string[];
}
