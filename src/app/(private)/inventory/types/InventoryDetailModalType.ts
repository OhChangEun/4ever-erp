import type { Schema } from '@/lib/api/contract';
import { type ModalProps } from '@/app/components/common/modal/types';

export interface InventoryDetailModalProps extends ModalProps {
  selectedItemId: string;
}

export type InventoryDetailResponse = Schema<'InventoryDetailResponse'>;

export type StockMovementRequest = Schema<'StockMovementRequest'>;
