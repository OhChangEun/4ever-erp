import { LowStockListQueryParams } from '@/app/(private)/low-stock/types/LowStockListType';

export const lowStockStatsKeys = {
  all: ['lowStock', 'stats'] as const,
};

export const lowStockKeys = {
  all: ['lowStock', 'items'] as const,

  lists: () => [...lowStockKeys.all, 'list'] as const,

  list: (params: LowStockListQueryParams) => [...lowStockKeys.lists(), params] as const,
};
