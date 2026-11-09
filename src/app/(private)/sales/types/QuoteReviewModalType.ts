import type { Schema } from '@/lib/api/contract';
import { ModalProps } from '@/app/components/common/modal/types';

export interface Quote {
  id: string;
  customer: string;
  contact: string;
  date: string;
  deliveryDate: string;
  amount: number;
  status: string;
}

export interface InventoryItem {
  product: string;
  currentStock: number;
  requiredStock: number;
  available: boolean;
}

export type InventoryCheckRes = Schema<'InventoryCheckRes'>;

export interface QuoteReviewModalProps extends ModalProps {
  selectedQuotationId: string;
}
