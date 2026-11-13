import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import {
  invalidateAll,
  useInvalidatingMutation,
  type MutationCallbacks,
} from '@/lib/query/useInvalidatingMutation';
import {
  CustomerAccountError,
  patchCustomer,
  postCustomer,
  postDeliveryProcess,
  postInventoryCheck,
  postNewQuote,
  postQuotationConfirm,
} from './sales.api';
import {
  analyticsKeys,
  customerKeys,
  quoteKeys,
  salesOrderKeys,
  salesStatsKeys,
} from './sales.keys';
import type { NewOrderRequest } from '@/app/(private)/sales/types/NewOrderModalType';
import type {
  CustomerEditData,
  CustomerResponse,
} from '@/app/(private)/sales/types/CustomerEditModalType';
import type { Inventories } from '@/app/(private)/sales/types/QuoteDetailModalType';
import type { InventoryCheckRes } from '@/app/(private)/sales/types/QuoteReviewModalType';
import type {
  CustomerData,
  CreateCustomerResponse,
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
  updateCustomer: (customerId: string): readonly QueryKey[] => [
    customerKeys.lists(),
    customerKeys.detail(customerId),
  ],
  createQuote: (): readonly QueryKey[] => [quoteKeys.lists(), salesStatsKeys.all],
  confirmQuotation: (quotationId: string): readonly QueryKey[] => [
    quoteKeys.lists(),
    quoteKeys.detail(quotationId),
    quoteKeys.reviewDetail(quotationId),
    salesStatsKeys.all,
  ],
  // 즉시 납품은 견적 상태를 바꾸고 주문을 만든다. 주문이 생기면 고객의 주문 수, 거래 금액, 마지막 주문일과
  // 매출 분석도 바뀐다. 어느 고객인지는 견적 id 만으로 몰라 고객 상세는 전부(영업 안에서만) 다시 받는다
  processDelivery: (quotationId: string): readonly QueryKey[] => [
    quoteKeys.lists(),
    quoteKeys.detail(quotationId),
    quoteKeys.reviewDetail(quotationId),
    salesOrderKeys.lists(),
    salesStatsKeys.all,
    customerKeys.lists(),
    customerKeys.details(),
    analyticsKeys.all,
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

/**
 * 고객 등록. 생성이라 낙관적 업데이트를 하지 않는다(결정 7).
 * 무효화: 성공이면 customerKeys.lists(). 안쪽 실패(CustomerAccountError)여도 같은 키를 무효화한다.
 * 고객사 행은 저장됐을 수 있어(계정 생성만 실패) 목록에 보여야 같은 고객을 또 등록하지 않는다(verified=false).
 * 다른 실패(4xx, 5xx, 네트워크)는 서버가 안 바뀐 것이라 무효화하지 않는다
 */
export const useCreateCustomer = (
  callbacks?: MutationCallbacks<CreateCustomerResponse | undefined, CustomerData>,
) => {
  const queryClient = useQueryClient();
  return useInvalidatingMutation<CreateCustomerResponse | undefined, CustomerData>({
    mutationKey: salesMutationKey('createCustomer'),
    mutationFn: (body) => postCustomer(body),
    effects: () => SALES_MUTATION_EFFECTS.createCustomer(),
    callbacks: {
      onSuccess: callbacks?.onSuccess,
      onError: (error, variables) => {
        if (error instanceof CustomerAccountError) {
          void invalidateAll(queryClient, SALES_MUTATION_EFFECTS.createCustomer());
        }
        callbacks?.onError?.(error, variables);
      },
    },
  });
};

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

export interface UpdateCustomerVariables {
  customerId: string;
  data: CustomerEditData;
}

/** 고객 수정. 목록(이름, 상태)과 그 고객 상세를 다시 가져온다 */
export const useUpdateCustomer = (
  callbacks?: MutationCallbacks<CustomerResponse, UpdateCustomerVariables>,
) =>
  useInvalidatingMutation<CustomerResponse, UpdateCustomerVariables>({
    mutationKey: salesMutationKey('updateCustomer'),
    mutationFn: ({ customerId, data }) => patchCustomer(customerId, data),
    effects: ({ customerId }) => SALES_MUTATION_EFFECTS.updateCustomer(customerId),
    callbacks,
  });
