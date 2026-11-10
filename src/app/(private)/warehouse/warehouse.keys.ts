import { type WarehouseListQueryParams } from '@/app/(private)/warehouse/types/WarehouseListType';

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
