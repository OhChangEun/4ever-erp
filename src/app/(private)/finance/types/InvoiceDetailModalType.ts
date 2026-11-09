import type { Schema } from '@/lib/api/contract';
import { ModalProps } from '@/app/components/common/modal/types';

export interface InvoiceDetailModalProps extends ModalProps {
  selectedInvoiceId: string;
}

export type InvoicetDetailRes = Schema<'InvoicetDetailRes'>;
