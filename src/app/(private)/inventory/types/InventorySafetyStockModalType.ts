export interface InventorySafetyStockModalProps {
  setShowSafetyStockModal: (show: boolean) => void;
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
