import { BomListRequestParams } from '@/app/(private)/production/types/BomListApiType';
import { FetchMesListParams } from '@/app/(private)/production/types/MesListApiType';
import { FetchMrpOrdersListParams } from '@/app/(private)/production/types/MrpOrdersApiType';
import { FetchMrpPlannedOrdersListParams } from '@/app/(private)/production/types/MrpPlannedOrdersListApiType';
import { FetchQuotationParams } from '@/app/(private)/production/types/QuotationApiType';

export const productionStatsKeys = {
  all: ['production', 'stats'] as const,
};

export const bomKeys = {
  all: ['production', 'bom'] as const,

  lists: () => [...bomKeys.all, 'list'] as const,

  list: (params: BomListRequestParams) => [...bomKeys.lists(), params] as const,

  details: () => [...bomKeys.all, 'detail'] as const,

  detail: (bomId: string) => [...bomKeys.details(), bomId] as const,

  materialInfo: (itemId: string) => [...bomKeys.all, 'materialInfo', itemId] as const,
};

export const mesKeys = {
  all: ['production', 'mes'] as const,

  lists: () => [...mesKeys.all, 'list'] as const,

  list: (params: FetchMesListParams) => [...mesKeys.lists(), params] as const,

  details: () => [...mesKeys.all, 'detail'] as const,

  detail: (mesId: string) => [...mesKeys.details(), mesId] as const,
};

export const mpsKeys = {
  all: ['production', 'mps'] as const,

  lists: () => [...mpsKeys.all, 'list'] as const,

  list: (bomId: string, startDate: string, endDate: string) =>
    [...mpsKeys.lists(), bomId, startDate, endDate] as const,
};

export const mrpOrderKeys = {
  all: ['production', 'mrpOrders'] as const,

  lists: () => [...mrpOrderKeys.all, 'list'] as const,

  list: (params: FetchMrpOrdersListParams) => [...mrpOrderKeys.lists(), params] as const,
};

export const mrpPlannedOrderKeys = {
  all: ['production', 'mrpPlannedOrders'] as const,

  lists: () => [...mrpPlannedOrderKeys.all, 'list'] as const,

  list: (params: FetchMrpPlannedOrdersListParams) =>
    [...mrpPlannedOrderKeys.lists(), params] as const,
};

export const quotationKeys = {
  all: ['production', 'quotation'] as const,

  lists: () => [...quotationKeys.all, 'list'] as const,

  list: (params: FetchQuotationParams) => [...quotationKeys.lists(), params] as const,
};
