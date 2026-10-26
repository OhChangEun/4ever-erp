import { PurchaseOrderListParams } from '@/app/(private)/purchase/types/PurchaseOrderType';

export const purchaseOrderKeys = {
  all: ['purchase', 'orders'] as const,

  lists: () => [...purchaseOrderKeys.all, 'list'] as const,

  list: (params: PurchaseOrderListParams) => [...purchaseOrderKeys.lists(), params] as const,

  details: () => [...purchaseOrderKeys.all, 'detail'] as const,

  detail: (purchaseOrderId: string) => [...purchaseOrderKeys.details(), purchaseOrderId] as const,
};

export const purchaseStatsKeys = {
  all: ['purchase', 'stats'] as const,
  byRole: (role: string | undefined) => [...purchaseStatsKeys.all, role] as const,
};
