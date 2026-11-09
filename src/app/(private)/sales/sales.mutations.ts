import type { QueryKey } from '@tanstack/react-query';
import {
  useInvalidatingMutation,
  type MutationCallbacks,
} from '@/lib/query/useInvalidatingMutation';
import {
  postCustomer,
  postDeliveryProcess,
  postInventoryCheck,
  postNewQuote,
  postQuotationConfirm,
} from './sales.api';
import { customerKeys, quoteKeys, salesOrderKeys, salesStatsKeys } from './sales.keys';
import type { NewOrderRequest } from '@/app/(private)/sales/types/NewOrderModalType';
import type { Inventories } from '@/app/(private)/sales/types/QuoteDetailModalType';
import type { InventoryCheckRes } from '@/app/(private)/sales/types/QuoteReviewModalType';
import type {
  CustomerData,
  ServerResponse,
} from '@/app/(private)/sales/types/NewCustomerModalType';
import type { ApiResponseNoData } from '@/app/types/api';

/**
 * 영업 도메인 mutation → 다시 가져올 쿼리 키. 이 표가 동작이다.
 * 재고 확인은 읽기라 여기 없다.
 */
export const SALES_MUTATION_EFFECTS = {
  // 재고 확인은 버튼으로 한 번 하는 계산 요청이다. 서버 상태를 안 바꿔 무효화할 것이 없다
  checkInventory: (): readonly QueryKey[] => [],
  createCustomer: (): readonly QueryKey[] => [customerKeys.lists()],
  createQuote: (): readonly QueryKey[] => [quoteKeys.lists(), salesStatsKeys.all],
  confirmQuotation: (quotationId: string): readonly QueryKey[] => [
    quoteKeys.lists(),
    quoteKeys.detail(quotationId),
    quoteKeys.reviewDetail(quotationId),
    salesStatsKeys.all,
  ],
  // 즉시 납품은 견적 상태를 바꾸고 주문을 만든다
  processDelivery: (quotationId: string): readonly QueryKey[] => [
    quoteKeys.lists(),
    quoteKeys.detail(quotationId),
    quoteKeys.reviewDetail(quotationId),
    salesOrderKeys.lists(),
    salesStatsKeys.all,
  ],
} as const;

export type SalesMutationName = keyof typeof SALES_MUTATION_EFFECTS;
export const salesMutationKey = (name: SalesMutationName) => ['sales', 'mutation', name] as const;

export const useCreateQuote = (callbacks?: MutationCallbacks<NewOrderRequest, NewOrderRequest>) =>
  useInvalidatingMutation<NewOrderRequest, NewOrderRequest>({
    mutationKey: salesMutationKey('createQuote'),
    mutationFn: (body) => postNewQuote(body),
    effects: () => SALES_MUTATION_EFFECTS.createQuote(),
    callbacks,
  });

export const useConfirmQuotation = (callbacks?: MutationCallbacks<ApiResponseNoData, string>) =>
  useInvalidatingMutation<ApiResponseNoData, string>({
    mutationKey: salesMutationKey('confirmQuotation'),
    mutationFn: (quotationId) => postQuotationConfirm(quotationId),
    effects: (quotationId) => SALES_MUTATION_EFFECTS.confirmQuotation(quotationId),
    callbacks,
  });

export const useProcessDelivery = (callbacks?: MutationCallbacks<ApiResponseNoData, string>) =>
  useInvalidatingMutation<ApiResponseNoData, string>({
    mutationKey: salesMutationKey('processDelivery'),
    mutationFn: (quotationId) => postDeliveryProcess(quotationId),
    effects: (quotationId) => SALES_MUTATION_EFFECTS.processDelivery(quotationId),
    callbacks,
  });

/** 고객 등록. 생성이라 낙관적 업데이트를 하지 않는다(결정 7) */
export const useCreateCustomer = (callbacks?: MutationCallbacks<ServerResponse, CustomerData>) =>
  useInvalidatingMutation<ServerResponse, CustomerData>({
    mutationKey: salesMutationKey('createCustomer'),
    mutationFn: (body) => postCustomer(body),
    effects: () => SALES_MUTATION_EFFECTS.createCustomer(),
    callbacks,
  });

/** 견적 검토의 재고 확인. 캐시할 이유가 없는 한 번짜리 계산이라 mutation 으로 둔다 */
export const useCheckInventory = (
  callbacks?: MutationCallbacks<InventoryCheckRes[], Inventories[]>,
) =>
  useInvalidatingMutation<InventoryCheckRes[], Inventories[]>({
    mutationKey: salesMutationKey('checkInventory'),
    mutationFn: (items) => postInventoryCheck(items),
    effects: () => SALES_MUTATION_EFFECTS.checkInventory(),
    callbacks,
  });
