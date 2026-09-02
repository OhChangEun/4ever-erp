export interface InventoryMoveModalProps {
  setShowMoveModal: (show: boolean) => void;
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
