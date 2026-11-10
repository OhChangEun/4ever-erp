import type { Schema } from '@/lib/api/contract';
import { type ModalProps } from '@/app/components/common/modal/types';

export interface WarehouseDetailModalProps extends ModalProps {
  handleWarehouseManage: (id: string, name: string) => void;
  selectedWarehouseId: string;
  selectedWarehouseName: string;
}

// 응답 모양은 OpenAPI 계약이 원본이다(openapi/everp.yaml)
export type WarehouseDetailResponse = Schema<'WarehouseDetail'>;
