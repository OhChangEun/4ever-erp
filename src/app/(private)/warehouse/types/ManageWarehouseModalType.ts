import type { Schema } from '@/lib/api/contract';
import { type ModalProps } from '@/app/components/common/modal/types';

export interface ManageWarehouseModalProps extends ModalProps {
  selectedWarehouseId: string;
}

// 요청 모양은 OpenAPI 계약이 원본이다(openapi/everp.yaml)
export type EditWarehouseRequest = Schema<'EditWarehouseRequest'>;
