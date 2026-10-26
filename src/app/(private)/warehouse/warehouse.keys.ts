import { WarehouseListQueryParams } from '@/app/(private)/warehouse/types/WarehouseListType';
import type { InventoryQueryParamForWarehouse } from '@/app/(private)/warehouse/components/warehouseVisualizer/useWarehouseClusters';

export const warehouseStatsKeys = {
  all: ['warehouse', 'stats'] as const,
};

export const warehouseKeys = {
  all: ['warehouse', 'warehouses'] as const,

  lists: () => [...warehouseKeys.all, 'list'] as const,

  list: (params: WarehouseListQueryParams) => [...warehouseKeys.lists(), params] as const,

  details: () => [...warehouseKeys.all, 'detail'] as const,

  detail: (warehouseId: string) => [...warehouseKeys.details(), warehouseId] as const,
};

export const warehouseManagerInfoKeys = {
  all: ['warehouse', 'managerInfo'] as const,
};

export const warehouseVisualizerKeys = {
  all: ['warehouse', 'visualizer'] as const,

  list: (params: InventoryQueryParamForWarehouse) =>
    [...warehouseVisualizerKeys.all, params] as const,
};
