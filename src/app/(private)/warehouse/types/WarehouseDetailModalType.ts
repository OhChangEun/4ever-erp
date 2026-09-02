import { ModalProps } from '@/app/components/common/modal/types';

export interface WarehouseDetailModalProps extends ModalProps {
  handleWarehouseManage: (id: string, name: string) => void;
  selectedWarehouseId: string;
  selectedWarehouseName: string;
}

export interface WarehouseDetailResponse {
  warehouseInfo: {
    warehouseName: string;
    warehouseNumber: string;
    warehouseType: string;
    statusCode: string;
    location: string;
    description: string;
  };
  manager: {
    managerId: string;
    managerName: string;
    managerPhoneNumber: string;
    managerEmail: string;
  };
}
