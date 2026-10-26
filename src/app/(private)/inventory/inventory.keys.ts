import { InventoryQueryParams } from '@/app/(private)/inventory/types/InventoryListType';
import { WarehouseToggleQueryParams } from '@/app/(private)/inventory/types/AddInventoryModalType';
import { ManageMentCommonQueryParams } from '@/app/(private)/inventory/types/ShippingManagementListType';

export const inventoryStatsKeys = {
  all: ['inventory', 'stats'] as const,
};

export const inventoryKeys = {
  all: ['inventory', 'items'] as const,

  lists: () => [...inventoryKeys.all, 'list'] as const,

  list: (params: InventoryQueryParams) => [...inventoryKeys.lists(), params] as const,

  details: () => [...inventoryKeys.all, 'detail'] as const,

  detail: (itemId: string) => [...inventoryKeys.details(), itemId] as const,
};

export const lowStockItemKeys = {
  all: ['inventory', 'lowStockItems'] as const,
};

export const stockMovementKeys = {
  all: ['inventory', 'stockMovement'] as const,
};

export const itemInfoKeys = {
  all: ['inventory', 'itemInfo'] as const,
};

export const warehouseInfoKeys = {
  all: ['inventory', 'warehouseInfo'] as const,

  list: (params: WarehouseToggleQueryParams) => [...warehouseInfoKeys.all, params] as const,
};

export const receivingKeys = {
  all: ['inventory', 'receiving'] as const,

  pendingLists: () => [...receivingKeys.all, 'pending'] as const,

  pendingList: (params: ManageMentCommonQueryParams) =>
    [...receivingKeys.pendingLists(), params] as const,

  receivedLists: () => [...receivingKeys.all, 'received'] as const,

  receivedList: (params: ManageMentCommonQueryParams) =>
    [...receivingKeys.receivedLists(), params] as const,
};

export const shippingKeys = {
  all: ['inventory', 'shipping'] as const,

  productionLists: () => [...shippingKeys.all, 'production'] as const,

  productionList: (params: ManageMentCommonQueryParams) =>
    [...shippingKeys.productionLists(), params] as const,

  readyToShipLists: () => [...shippingKeys.all, 'readyToShip'] as const,

  readyToShipList: (params: ManageMentCommonQueryParams) =>
    [...shippingKeys.readyToShipLists(), params] as const,

  details: () => [...shippingKeys.all, 'detail'] as const,

  detail: (orderId: string) => [...shippingKeys.details(), orderId] as const,
};
