import { type ModalProps } from '@/app/components/common/modal/types';

export interface InventoryMoveModalProps extends ModalProps {
  selectedStock: {
    itemId: string;
    itemName: string;
    itemNumber: string;
    warehouseId: string;
    warehouseName: string;
    warehouseNumber: string;
    currentStock: number;
    uomName: string;
  };
}
