import { PurchaseOrderListParams } from '@/app/(private)/purchase/types/PurchaseOrderType';
import { PurchaseRequestListParams } from '@/app/(private)/purchase/types/PurchaseRequestType';
import { SupplierListParams } from '@/app/(private)/purchase/types/SupplierType';

export const purchaseOrderKeys = {
  all: ['purchase', 'orders'] as const,

  lists: () => [...purchaseOrderKeys.all, 'list'] as const,

  list: (params: PurchaseOrderListParams) => [...purchaseOrderKeys.lists(), params] as const,

  details: () => [...purchaseOrderKeys.all, 'detail'] as const,

  detail: (purchaseOrderId: string) => [...purchaseOrderKeys.details(), purchaseOrderId] as const,
};

export const purchaseRequestKeys = {
  all: ['purchase', 'requests'] as const,

  lists: () => [...purchaseRequestKeys.all, 'list'] as const,

  list: (params: PurchaseRequestListParams) => [...purchaseRequestKeys.lists(), params] as const,

  details: () => [...purchaseRequestKeys.all, 'detail'] as const,

  detail: (purchaseRequestId: string) =>
    [...purchaseRequestKeys.details(), purchaseRequestId] as const,
};

export const supplierKeys = {
  all: ['purchase', 'suppliers'] as const,

  lists: () => [...supplierKeys.all, 'list'] as const,

  list: (params: SupplierListParams) => [...supplierKeys.lists(), params] as const,

  details: () => [...supplierKeys.all, 'detail'] as const,

  detail: (supplierId: string) => [...supplierKeys.details(), supplierId] as const,
};

export const purchaseStatsKeys = {
  all: ['purchase', 'stats'] as const,
  byRole: (role: string | undefined) => [...purchaseStatsKeys.all, role] as const,
};
