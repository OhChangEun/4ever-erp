import type { Schema } from '@/lib/api/contract';
export type AddInventoryItemsToggleResponse = Schema<'AddInventoryItemsToggleResponse'>;

export type WarehouseToggleResponse = Schema<'WarehouseToggleResponse'>;

export type AddInventoryItemsRequest = Schema<'AddInventoryItemsRequest'>;

export interface WarehouseToggleQueryParams {
  warehouseId: string;
}
