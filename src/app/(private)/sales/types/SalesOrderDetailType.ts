import type { Schema } from '@/lib/api/contract';
import { ModalProps } from '@/app/components/common/modal/types';

export interface SalesOrderDetailProps extends ModalProps {
  selectedSalesOrderId: string;
}

export type OrderDetail = Schema<'OrderDetail'>;
