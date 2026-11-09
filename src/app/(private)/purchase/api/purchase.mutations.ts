import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  approvePurchaseOrder,
  approvePurchaseRequest,
  createPurchaseRequest,
  createSupplier,
  rejectPurchaseOrder,
  rejectPurchaseRequest,
  startPurchaseOrderDelivery,
  updateSupplier,
} from './purchase.api';
import {
  purchaseOrderKeys,
  purchaseRequestKeys,
  purchaseStatsKeys,
  supplierKeys,
} from './purchase.keys';
import type { CreatePurchaseRequestBody } from '@/app/(private)/purchase/types/PurchaseRequestType';
import type {
  CreateSupplierBody,
  UpdateSupplierBody,
} from '@/app/(private)/purchase/types/SupplierType';
import type { ApiResponse } from '@/app/types/api';

/**
 * 구매 도메인 mutation 은 전부 여기서 만든다. 컴포넌트는 토스트, confirm, 모달 닫기만 맡는다.
 *
 * 아래 표가 "mutation 뒤 무엇을 다시 가져오나"의 단일 출처다. 훅은 이 표를 읽어 무효화하므로
 * 표와 동작이 따로 놀 수 없다. ARCHITECTURE.md 5절의 표는 이걸 옮겨 적은 것이다.
 * 다른 도메인 키는 넣지 않는다(10월 "재고가 인사 목록 무효화" 버그). 통계 키는 금액과 건수가
 * 바뀌는 mutation 마다 넣는다(10월 "통계 카드 누락" 버그).
 */
export const PURCHASE_MUTATION_EFFECTS = {
  approveOrder: (purchaseOrderId: string): readonly QueryKey[] => [
    purchaseOrderKeys.lists(),
    purchaseOrderKeys.detail(purchaseOrderId),
    purchaseStatsKeys.all,
  ],
  rejectOrder: (purchaseOrderId: string): readonly QueryKey[] => [
    purchaseOrderKeys.lists(),
    purchaseOrderKeys.detail(purchaseOrderId),
    purchaseStatsKeys.all,
  ],
  startDelivery: (purchaseOrderId: string): readonly QueryKey[] => [
    purchaseOrderKeys.lists(),
    purchaseOrderKeys.detail(purchaseOrderId),
    purchaseStatsKeys.all,
  ],
  // 요청 승인(release)은 발주를 만들 수 있다(서버 계약 미확인, OpenAPI 카드에서 확정). 발주 목록도 다시 가져온다.
  approveRequest: (purchaseRequestId: string): readonly QueryKey[] => [
    purchaseRequestKeys.lists(),
    purchaseRequestKeys.detail(purchaseRequestId),
    purchaseOrderKeys.lists(),
    purchaseStatsKeys.all,
  ],
  rejectRequest: (purchaseRequestId: string): readonly QueryKey[] => [
    purchaseRequestKeys.lists(),
    purchaseRequestKeys.detail(purchaseRequestId),
    purchaseStatsKeys.all,
  ],
  createRequest: (): readonly QueryKey[] => [purchaseRequestKeys.lists(), purchaseStatsKeys.all],
  createSupplier: (): readonly QueryKey[] => [supplierKeys.lists()],
  updateSupplier: (supplierId: string): readonly QueryKey[] => [
    supplierKeys.lists(),
    supplierKeys.detail(supplierId),
  ],
} as const;

export type PurchaseMutationName = keyof typeof PURCHASE_MUTATION_EFFECTS;

/** 중복 제출 방지 카드가 useIsMutating({ mutationKey }) 로 쓴다. */
export const purchaseMutationKey = (name: PurchaseMutationName) =>
  ['purchase', 'mutation', name] as const;

/** 컴포넌트가 넘길 수 있는 것. 무효화는 훅이 하고, 여기 onSuccess 는 그 뒤에 불린다. */
export interface MutationCallbacks<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

const invalidateAll = (queryClient: QueryClient, keys: readonly QueryKey[]) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

type Result<TData, TVariables> = UseMutationResult<TData, Error, TVariables>;

function usePurchaseMutation<TData, TVariables>(
  name: PurchaseMutationName,
  mutationFn: (variables: TVariables) => Promise<TData>,
  effects: (variables: TVariables) => readonly QueryKey[],
  callbacks: MutationCallbacks<TData, TVariables> = {},
): Result<TData, TVariables> {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVariables>({
    mutationKey: purchaseMutationKey(name),
    mutationFn,
    onSuccess: async (data, variables) => {
      // 성공했을 때만 다시 가져온다. 실패면 서버가 안 바뀌었다.
      await invalidateAll(queryClient, effects(variables));
      callbacks.onSuccess?.(data, variables);
    },
    onError: (error, variables) => callbacks.onError?.(error, variables),
  });
}

type NoData = ApiResponse<null>;

export const useApprovePurchaseOrder = (callbacks?: MutationCallbacks<NoData, string>) =>
  usePurchaseMutation(
    'approveOrder',
    (purchaseOrderId: string) => approvePurchaseOrder(purchaseOrderId),
    PURCHASE_MUTATION_EFFECTS.approveOrder,
    callbacks,
  );

export interface RejectPurchaseOrderVariables {
  purchaseOrderId: string;
  reason: string;
}
export const useRejectPurchaseOrder = (
  callbacks?: MutationCallbacks<NoData, RejectPurchaseOrderVariables>,
) =>
  usePurchaseMutation(
    'rejectOrder',
    ({ purchaseOrderId, reason }: RejectPurchaseOrderVariables) =>
      rejectPurchaseOrder(purchaseOrderId, reason),
    ({ purchaseOrderId }) => PURCHASE_MUTATION_EFFECTS.rejectOrder(purchaseOrderId),
    callbacks,
  );

export const useStartPurchaseOrderDelivery = (callbacks?: MutationCallbacks<NoData, string>) =>
  usePurchaseMutation(
    'startDelivery',
    (purchaseOrderId: string) => startPurchaseOrderDelivery(purchaseOrderId),
    PURCHASE_MUTATION_EFFECTS.startDelivery,
    callbacks,
  );

export const useApprovePurchaseRequest = (callbacks?: MutationCallbacks<NoData, string>) =>
  usePurchaseMutation(
    'approveRequest',
    (purchaseRequestId: string) => approvePurchaseRequest(purchaseRequestId),
    PURCHASE_MUTATION_EFFECTS.approveRequest,
    callbacks,
  );

export interface RejectPurchaseRequestVariables {
  purchaseRequestId: string;
  comment: string;
}
export const useRejectPurchaseRequest = (
  callbacks?: MutationCallbacks<NoData, RejectPurchaseRequestVariables>,
) =>
  usePurchaseMutation(
    'rejectRequest',
    ({ purchaseRequestId, comment }: RejectPurchaseRequestVariables) =>
      rejectPurchaseRequest(purchaseRequestId, comment),
    ({ purchaseRequestId }) => PURCHASE_MUTATION_EFFECTS.rejectRequest(purchaseRequestId),
    callbacks,
  );

export const useCreatePurchaseRequest = (
  callbacks?: MutationCallbacks<NoData, CreatePurchaseRequestBody>,
) =>
  usePurchaseMutation(
    'createRequest',
    (body: CreatePurchaseRequestBody) => createPurchaseRequest(body),
    () => PURCHASE_MUTATION_EFFECTS.createRequest(),
    callbacks,
  );

export const useCreateSupplier = (callbacks?: MutationCallbacks<NoData, CreateSupplierBody>) =>
  usePurchaseMutation(
    'createSupplier',
    (body: CreateSupplierBody) => createSupplier(body),
    () => PURCHASE_MUTATION_EFFECTS.createSupplier(),
    callbacks,
  );

export interface UpdateSupplierVariables {
  supplierId: string;
  body: UpdateSupplierBody;
}
export const useUpdateSupplier = (callbacks?: MutationCallbacks<NoData, UpdateSupplierVariables>) =>
  usePurchaseMutation(
    'updateSupplier',
    ({ supplierId, body }: UpdateSupplierVariables) => updateSupplier(supplierId, body),
    ({ supplierId }) => PURCHASE_MUTATION_EFFECTS.updateSupplier(supplierId),
    callbacks,
  );
