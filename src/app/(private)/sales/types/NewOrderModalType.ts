import type { Schema } from '@/lib/api/contract';
export interface NewOrderModalProps {
  showNewOrderModal: boolean;
  setShowNewOrderModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

export type NewOrderRequest = Schema<'NewOrderRequest'>;

export type NewOrderItem = Schema<'NewOrderItem'>;

export type ItemResponse = Schema<'SalesItemResponse'>;
