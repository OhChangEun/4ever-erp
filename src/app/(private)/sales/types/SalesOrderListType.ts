import type { Schema } from '@/lib/api/contract';
export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus =
  | 'ALL'
  | 'MATERIAL_PREPARATION'
  | 'IN_PRODUCTION'
  | 'READY_FOR_SHIPMENT'
  | 'DELIVERING'
  | 'DELIVERED';

export type Order = Schema<'Order'>;

export interface OrderQueryParams {
  start: string;
  end: string;
  keyword: string;
  type: string;
  status: string;
  page: number;
  size: number;
}
