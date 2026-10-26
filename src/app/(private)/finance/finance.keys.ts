import { InvoiceQueryParams } from '@/app/(private)/finance/types/InvoiceListType';

export type InvoiceTab = 'sales' | 'purchase';

export const financeStatsKeys = {
  all: ['finance', 'stats'] as const,
  byRole: (role: string | undefined) => [...financeStatsKeys.all, role] as const,
};

export const invoiceKeys = {
  all: ['finance', 'invoices'] as const,

  // 탭(매출/매입)별로 목록 캐시를 분리한다. lists(tab)으로 해당 탭만 무효화 가능
  lists: (tab?: InvoiceTab) =>
    tab ? ([...invoiceKeys.all, 'list', tab] as const) : ([...invoiceKeys.all, 'list'] as const),

  list: (tab: InvoiceTab, params: InvoiceQueryParams) =>
    [...invoiceKeys.all, 'list', tab, params] as const,

  details: () => [...invoiceKeys.all, 'detail'] as const,

  detail: (invoiceId: string) => [...invoiceKeys.details(), invoiceId] as const,
};
