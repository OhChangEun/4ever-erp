import { describe, it } from 'vitest';
import { expectMatrix } from '@/test/mutationMatrix';
import { customerKeys, quoteKeys, salesOrderKeys, salesStatsKeys } from './sales.keys';
import { useConfirmQuotation, useCreateQuote, useProcessDelivery } from './sales.mutations';

const FOREIGN = ['purchase', 'orders', 'list'];
const QUOTE_LIST = quoteKeys.list({ page: 0, size: 10 });
const ORDER_LIST = salesOrderKeys.list({
  page: 0,
  size: 10,
  start: '',
  end: '',
  keyword: '',
  type: '',
  status: 'ALL',
});
const CUSTOMER_LIST = customerKeys.list({ page: 0, size: 10 });

describe('영업 mutation 훅', () => {
  it('견적 생성 → 견적 목록, 통계', () =>
    expectMatrix({
      name: '',
      useHook: useCreateQuote,
      variables: { items: [] },
      invalidates: [QUOTE_LIST, salesStatsKeys.byRole('ALL_ADMIN')],
      keeps: [ORDER_LIST, CUSTOMER_LIST, FOREIGN],
    }));

  it('검토 요청 → 견적 목록, 상세, 검토 상세, 통계', () =>
    expectMatrix({
      name: '',
      useHook: useConfirmQuotation,
      variables: 'q-1',
      invalidates: [
        QUOTE_LIST,
        quoteKeys.detail('q-1'),
        quoteKeys.reviewDetail('q-1'),
        salesStatsKeys.byRole('ALL_ADMIN'),
      ],
      keeps: [ORDER_LIST, CUSTOMER_LIST, FOREIGN],
    }));

  it('즉시 납품 → 견적 목록, 상세, 검토 상세, 주문 목록, 통계', () =>
    expectMatrix({
      name: '',
      useHook: useProcessDelivery,
      variables: 'q-1',
      invalidates: [
        QUOTE_LIST,
        quoteKeys.detail('q-1'),
        quoteKeys.reviewDetail('q-1'),
        ORDER_LIST,
        salesStatsKeys.byRole('ALL_ADMIN'),
      ],
      keeps: [CUSTOMER_LIST, FOREIGN],
    }));
});
