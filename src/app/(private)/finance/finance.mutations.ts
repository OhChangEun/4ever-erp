import type { QueryKey } from '@tanstack/react-query';
import {
  useInvalidatingMutation,
  type MutationCallbacks,
} from '@/lib/query/useInvalidatingMutation';
import { postApInvoice, postArInvoice, postSupplierApInvoice } from './finance.api';
import {
  financeAnalyticsKeys,
  financeStatsKeys,
  invoiceKeys,
  type InvoiceTab,
} from './finance.keys';
import type { ApiResponseNoData } from '@/app/types/api';

/** 전표 처리 종류. 매출(ar) 수금 완료, 매입(ap) 지급 요청, 공급사(supplierAp) 지급 완료 */
export type InvoiceAction = 'ar' | 'ap' | 'supplierAp';

export interface CompleteInvoiceVariables {
  invoiceId: string;
  tab: InvoiceTab;
  action: InvoiceAction;
}

/** 재무 도메인 mutation → 다시 가져올 쿼리 키. 이 표가 동작이다. */
export const FINANCE_MUTATION_EFFECTS = {
  completeInvoice: ({ invoiceId, tab }: CompleteInvoiceVariables): readonly QueryKey[] => [
    invoiceKeys.lists(tab),
    invoiceKeys.detail(invoiceId),
    financeStatsKeys.all,
    // 재무 현황도 통계와 같은 규칙. 서버가 발생 기준인지 현금 기준인지 몰라 넓게 잡는다(시각화 4 결정 2)
    financeAnalyticsKeys.all,
  ],
} as const;

export type FinanceMutationName = keyof typeof FINANCE_MUTATION_EFFECTS;
export const financeMutationKey = (name: FinanceMutationName) =>
  ['finance', 'mutation', name] as const;

const INVOICE_ACTION_FN: Record<InvoiceAction, (invoiceId: string) => Promise<ApiResponseNoData>> =
  {
    ar: postArInvoice,
    ap: postApInvoice,
    supplierAp: postSupplierApInvoice,
  };

export const useCompleteInvoice = (
  callbacks?: MutationCallbacks<ApiResponseNoData, CompleteInvoiceVariables>,
) =>
  useInvalidatingMutation<ApiResponseNoData, CompleteInvoiceVariables>({
    mutationKey: financeMutationKey('completeInvoice'),
    mutationFn: ({ invoiceId, action }) => INVOICE_ACTION_FN[action](invoiceId),
    effects: (variables) => FINANCE_MUTATION_EFFECTS.completeInvoice(variables),
    callbacks,
  });
