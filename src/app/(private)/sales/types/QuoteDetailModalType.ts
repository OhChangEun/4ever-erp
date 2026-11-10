import type { Schema } from '@/lib/api/contract';
import { type ModalProps } from '@/app/components/common/modal/types';

export interface QuoteDetailModalProps extends ModalProps {
  selectedQuotationId: string;
}

export type QuoteDetail = Schema<'QuoteDetail'>;

export type Inventories = Schema<'Inventories'>;
