import { describe, it } from 'vitest';
import { expectMatrix } from '@/test/mutationMatrix';
import { inventoryKeys, lowStockItemKeys } from './inventory.keys';
import { purchaseRequestKeys, purchaseStatsKeys } from '@/app/(private)/purchase/api/purchase.keys';
import { useRequestPurchaseForLowStock } from './inventory.mutations';

describe('재고 mutation 훅', () => {
  it('부족 재고 구매 요청 → 부족 재고 목록 + 구매 요청 목록, 구매 통계(의도한 교차)', () =>
    expectMatrix({
      name: '',
      useHook: useRequestPurchaseForLowStock,
      variables: [{ productId: 'item-1001', quantity: 10 }],
      invalidates: [lowStockItemKeys.all, purchaseRequestKeys.lists(), purchaseStatsKeys.all],
      keeps: [inventoryKeys.lists(), ['hrm', 'employees', 'list']],
    }));
});
