import { describe, it } from 'vitest';
import { expectMatrix } from '@/test/mutationMatrix';
import { financeStatsKeys, invoiceKeys } from './finance.keys';
import { useCompleteInvoice } from './finance.mutations';

const PARAMS = { page: 0, size: 10, status: 'ALL' };

describe('재무 mutation 훅', () => {
  it.each(['ar', 'ap', 'supplierAp'] as const)(
    '전표 처리(%s) → 해당 탭 목록, 상세, 통계. 다른 탭 목록은 그대로',
    (action) => {
      const tab = action === 'ar' ? 'sales' : 'purchase';
      const otherTab = tab === 'sales' ? 'purchase' : 'sales';
      return expectMatrix({
        name: '',
        useHook: useCompleteInvoice,
        variables: { invoiceId: 'inv-1', tab, action },
        invalidates: [
          invoiceKeys.list(tab, PARAMS),
          invoiceKeys.detail('inv-1'),
          financeStatsKeys.byRole('ALL_ADMIN'),
        ],
        keeps: [invoiceKeys.list(otherTab, PARAMS), ['sales', 'quotes', 'list']],
      });
    },
  );
});
