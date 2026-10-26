import { QuoteQueryParams } from '@/app/(private)/sales/types/SalesQuoteListType';
import { CustomerQueryParams } from '@/app/(private)/sales/types/SalesCustomerListType';
import { OrderQueryParams } from '@/app/(private)/sales/types/SalesOrderListType';
import { AnalyticsQueryParams } from '@/app/(private)/sales/types/SalesChartType';

export const salesStatsKeys = {
  all: ['sales', 'stats'] as const,
  byRole: (role: string | undefined) => [...salesStatsKeys.all, role] as const,
};

export const quoteKeys = {
  all: ['sales', 'quotes'] as const,

  lists: () => [...quoteKeys.all, 'list'] as const,

  list: (params: QuoteQueryParams) => [...quoteKeys.lists(), params] as const,

  details: () => [...quoteKeys.all, 'detail'] as const,

  detail: (quotationId: string) => [...quoteKeys.details(), quotationId] as const,

  // 견적 검토 모달 전용 상세 (QuoteDetailModal 캐시와 분리)
  reviewDetails: () => [...quoteKeys.all, 'reviewDetail'] as const,

  reviewDetail: (quotationId: string) => [...quoteKeys.reviewDetails(), quotationId] as const,

  // 신규 견적 작성 시 품목 정보
  itemInfoForNew: () => [...quoteKeys.all, 'itemInfoForNew'] as const,
};

export const customerKeys = {
  all: ['sales', 'customers'] as const,

  lists: () => [...customerKeys.all, 'list'] as const,

  list: (params: CustomerQueryParams) => [...customerKeys.lists(), params] as const,

  details: () => [...customerKeys.all, 'detail'] as const,

  detail: (customerId: string) => [...customerKeys.details(), customerId] as const,
};

export const salesOrderKeys = {
  all: ['sales', 'orders'] as const,

  lists: () => [...salesOrderKeys.all, 'list'] as const,

  list: (params: OrderQueryParams) => [...salesOrderKeys.lists(), params] as const,

  details: () => [...salesOrderKeys.all, 'detail'] as const,

  detail: (salesOrderId: string) => [...salesOrderKeys.details(), salesOrderId] as const,
};

export const analyticsKeys = {
  all: ['sales', 'analytics'] as const,
  byParams: (params: AnalyticsQueryParams) => [...analyticsKeys.all, params] as const,
};
