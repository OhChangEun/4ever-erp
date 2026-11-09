import type { Schema } from '@/lib/api/contract';
import { ModalProps } from '@/app/components/common/modal/types';

export interface QuoteDetailModalProps extends ModalProps {
  selectedQuotationId: string;
}

export type QuoteDetail = Schema<'QuoteDetail'>;

type Item = Schema<'Item'>;

export type Inventories = Schema<'Inventories'>;
