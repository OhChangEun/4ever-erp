import { type ModalProps } from '@/app/components/common/modal/types';

export interface InventorySafetyStockModalProps extends ModalProps {
  selectedStock: {
    itemId: string;
    itemName: string;
    itemNumber: string;
    warehouseName: string;
    warehouseNumber: string;
    safetyStock: number;
    currentStock: number;
    uomName: string;
  };
}
