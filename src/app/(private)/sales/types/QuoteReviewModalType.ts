import type { Schema } from '@/lib/api/contract';
import { type ModalProps } from '@/app/components/common/modal/types';

export type InventoryCheckRes = Schema<'InventoryCheckRes'>;

export interface QuoteReviewModalProps extends ModalProps {
  selectedQuotationId: string;
}
