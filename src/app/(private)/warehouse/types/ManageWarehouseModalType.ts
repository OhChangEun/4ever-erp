import { ModalProps } from '@/app/components/common/modal/types';

export interface ManageWarehouseModalProps extends ModalProps {
  selectedWarehouseId: string;
}

export interface EditWarehouseRequest {
  warehouseName: string;
  warehouseType: string;
  location: string;
  managerId: string;
  warehouseStatusCode: string;
  note: string;
}
