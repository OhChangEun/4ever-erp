import { ModalProps } from '@/app/components/common/modal/types';

export interface InventoryDetailModalProps extends ModalProps {
  selectedItemId: string;
  setSelectedItemId: (itemId: string) => void;
}

export interface StockMovement {
  type: string;
  quantity: number;
  uomName: string;
  from: string;
  to: string;
  movementDate: string;
  managerName: string;
  referenceNumber: string;
  note: string;
}

export interface InventoryDetailResponse {
  itemId: string;
  itemNumber: string;
  itemName: string;
  category: string;
  supplierCompanyName: string;
  statusCode: string;
  currentStock: number;
  safetyStock: number;
  uomName: string;
  unitPrice: number;
  totalAmount: number;
  warehouseId: string;
  warehouseName: string;
  warehouseNumber: string;
  location: string;
  lastModified: string;
  description: string;
  stockMovement: StockMovement[];
}

export interface StockMovementRequest {
  fromWarehouseId: string;
  toWarehouseId: string;
  itemId: string;
  stockQuantity: number;
  uomName: string;
  reason: string;
}
