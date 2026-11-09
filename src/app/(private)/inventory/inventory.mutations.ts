import type { QueryKey } from '@tanstack/react-query';
import {
  useInvalidatingMutation,
  type MutationCallbacks,
} from '@/lib/query/useInvalidatingMutation';
import { lowStockItemKeys } from './inventory.keys';
import { createStockPurchaseRequest } from '@/app/(private)/purchase/api/purchase.api';
import { purchaseRequestKeys, purchaseStatsKeys } from '@/app/(private)/purchase/api/purchase.keys';
import type { CreateStockPurchaseRequestItem } from '@/app/(private)/purchase/types/PurchaseRequestType';
import type { ApiResponse } from '@/app/types/api';

/**
 * 재고 도메인 mutation → 다시 가져올 쿼리 키. 이 표가 동작이다.
 * 낙관적 업데이트가 있는 모달(자재 추가, 재고 이동, 안전재고)은 아직 컴포넌트 안에 있다(사용자 카드).
 */
export const INVENTORY_MUTATION_EFFECTS = {
  // 부족 재고에서 구매 요청. 구매 도메인 데이터를 만들므로 구매 키 2개는 의도한 교차.
  requestPurchaseForLowStock: (): readonly QueryKey[] => [
    lowStockItemKeys.all,
    purchaseRequestKeys.lists(),
    purchaseStatsKeys.all,
  ],
} as const;

export type InventoryMutationName = keyof typeof INVENTORY_MUTATION_EFFECTS;
export const inventoryMutationKey = (name: InventoryMutationName) =>
  ['inventory', 'mutation', name] as const;

export const useRequestPurchaseForLowStock = (
  callbacks?: MutationCallbacks<ApiResponse<null>, CreateStockPurchaseRequestItem[]>,
) =>
  useInvalidatingMutation<ApiResponse<null>, CreateStockPurchaseRequestItem[]>({
    mutationKey: inventoryMutationKey('requestPurchaseForLowStock'),
    mutationFn: (items) => createStockPurchaseRequest({ items }),
    effects: () => INVENTORY_MUTATION_EFFECTS.requestPurchaseForLowStock(),
    callbacks,
  });
