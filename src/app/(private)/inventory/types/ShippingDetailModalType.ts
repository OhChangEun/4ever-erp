import type { Schema } from '@/lib/api/contract';
import { ModalProps } from '@/app/components/common/modal/types';

export interface ShippingDetailModalProps extends ModalProps {
  selectedSubTab: string;
  selectedOrderId: string;
}

export type ShippingDetailResponse = Schema<'ShippingDetailResponse'>;

export interface OrderItemsType {
  itemName: string;
  quantity: number;
  uomName: string;
}

export type markAsReadyToShipResponse = Schema<'markAsReadyToShipResponse'>;

export type markAsReadyRequest = Schema<'markAsReadyRequest'>;
