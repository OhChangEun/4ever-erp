import { type InventoryQueryParams } from '@/app/(private)/inventory/types/InventoryListType';
import { type WarehouseToggleQueryParams } from '@/app/(private)/inventory/types/AddInventoryModalType';
import { type ManageMentCommonQueryParams } from '@/app/(private)/inventory/types/ShippingManagementListType';

export const inventoryStatsKeys = {
  all: ['inventory', 'stats'] as const,
};

export const inventoryKeys = {
  all: ['inventory', 'items'] as const,

  lists: () => [...inventoryKeys.all, 'list'] as const,

  list: (params: InventoryQueryParams) => [...inventoryKeys.lists(), params] as const,

  details: () => [...inventoryKeys.all, 'detail'] as const,

  detail: (itemId: string) => [...inventoryKeys.details(), itemId] as const,

  // 상세 키 아래에 둔다. 재고 이동, 안전재고 수정이 상세를 무효화하면 추이도 같이 다시 받는다(시각화 2)
  history: (itemId: string) => [...inventoryKeys.detail(itemId), 'history'] as const,
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

  // 생산중 상세와 출고 준비 상세는 다른 API 라 하위 탭을 키에 넣는다. 같은 주문이 두 탭에 걸쳐도 서로의 캐시를 안 본다
  detail: (subTab: string, orderId: string) =>
    [...shippingKeys.details(), subTab, orderId] as const,
};
