import type { QueryKey } from '@tanstack/react-query';
import {
  useInvalidatingMutation,
  type MutationCallbacks,
} from '@/lib/query/useInvalidatingMutation';
import {
  completeMes,
  completeMesOperation,
  fetchQuotationConfirm,
  simulateQuotations,
  patchBomStatus,
  postBomItem,
  postMrpConvert,
  simulateBomConflict,
  startMes,
  startMesOperation,
} from './production.api';
import {
  bomKeys,
  mesKeys,
  mrpOrderKeys,
  mrpPlannedOrderKeys,
  productionStatsKeys,
  quotationKeys,
} from './production.keys';
import { createStockPurchaseRequest } from '@/app/(private)/purchase';
import { purchaseRequestKeys, purchaseStatsKeys } from '@/app/(private)/purchase';
import type { BomRequestBody } from '@/app/(private)/production/types/BomType';
import type { MrpOrdersConvertReqeustBody } from '@/app/(private)/production/types/MrpOrdersConvertApiType';
import type { CreateStockPurchaseRequestBody } from '@/app/(private)/purchase';
import type { ApiResponse } from '@/app/types/api';
import type { QuotationSimulationResponse } from '@/app/(private)/production/types/QuotationSimulationApiType';

/**
 * 생산 도메인 mutation → 다시 가져올 쿼리 키. 이 표가 동작이다.
 * 자재 구매 요청은 구매 도메인 데이터를 만들므로 구매 키 2개를 일부러 넣었다("다른 도메인 금지"의 예외, 표에 적음).
 * 충돌 시뮬레이션(테스트 전용)은 서버 버전만 올리고 화면은 옛 값이어야 409 를 볼 수 있어 아무것도 안 지운다.
 */
export const PRODUCTION_MUTATION_EFFECTS = {
  updateBomStatus: (bomId: string): readonly QueryKey[] => [bomKeys.detail(bomId), bomKeys.lists()],
  simulateBomConflict: (): readonly QueryKey[] => [],
  createBom: (): readonly QueryKey[] => [bomKeys.lists(), productionStatsKeys.all],
  createStockPurchaseRequest: (): readonly QueryKey[] => [
    mrpPlannedOrderKeys.lists(),
    purchaseRequestKeys.lists(), // 구매 도메인. 의도한 교차
    purchaseStatsKeys.all, // 구매 도메인. 의도한 교차
  ],
  // 전환된 계획 주문은 계획 주문 탭에서 빠진다
  convertMrpOrders: (): readonly QueryKey[] => [mrpOrderKeys.lists(), mrpPlannedOrderKeys.lists()],
  confirmQuotations: (): readonly QueryKey[] => [quotationKeys.lists()],
  // 시뮬레이션은 견적의 가용 재고 상태를 바꾼다
  simulateQuotations: (): readonly QueryKey[] => [quotationKeys.lists()],
  startMes: (mesId: string): readonly QueryKey[] => [
    mesKeys.detail(mesId),
    mesKeys.lists(),
    productionStatsKeys.all,
  ],
  completeMes: (mesId: string): readonly QueryKey[] => [
    mesKeys.detail(mesId),
    mesKeys.lists(),
    productionStatsKeys.all,
  ],
  startMesOperation: (mesId: string): readonly QueryKey[] => [
    mesKeys.detail(mesId),
    mesKeys.lists(),
    productionStatsKeys.all,
  ],
  completeMesOperation: (mesId: string): readonly QueryKey[] => [
    mesKeys.detail(mesId),
    mesKeys.lists(),
    productionStatsKeys.all,
  ],
} as const;

export type ProductionMutationName = keyof typeof PRODUCTION_MUTATION_EFFECTS;

export const productionMutationKey = (name: ProductionMutationName) =>
  ['production', 'mutation', name] as const;

function useProductionMutation<TData, TVariables>(
  name: ProductionMutationName,
  mutationFn: (variables: TVariables) => Promise<TData>,
  effects: (variables: TVariables) => readonly QueryKey[],
  callbacks?: MutationCallbacks<TData, TVariables>,
) {
  return useInvalidatingMutation<TData, TVariables>({
    mutationKey: productionMutationKey(name),
    mutationFn,
    effects,
    callbacks,
  });
}

type NoData = ApiResponse<null>;

export interface UpdateBomStatusVariables {
  bomId: string;
  statusCode: string;
  /** 마지막으로 읽은 버전. 서버 버전과 다르면 409(kind conflict). 컴포넌트가 다이얼로그를 띄운다 */
  version: string;
}
export const useUpdateBomStatus = (
  callbacks?: MutationCallbacks<{ status: number; message: string }, UpdateBomStatusVariables>,
) =>
  useProductionMutation(
    'updateBomStatus',
    ({ bomId, statusCode, version }: UpdateBomStatusVariables) =>
      patchBomStatus(bomId, { statusCode, version }),
    ({ bomId }) => PRODUCTION_MUTATION_EFFECTS.updateBomStatus(bomId),
    callbacks,
  );

/** [개발 테스트 전용] 서버 버전을 올려 다음 수정에서 409 를 재현한다 */
export const useSimulateBomConflict = (
  callbacks?: MutationCallbacks<{ message: string }, string>,
) =>
  useProductionMutation(
    'simulateBomConflict',
    (bomId: string) => simulateBomConflict(bomId),
    () => PRODUCTION_MUTATION_EFFECTS.simulateBomConflict(),
    callbacks,
  );

export const useCreateBom = (callbacks?: MutationCallbacks<NoData, BomRequestBody>) =>
  useProductionMutation(
    'createBom',
    (body: BomRequestBody) => postBomItem(body),
    () => PRODUCTION_MUTATION_EFFECTS.createBom(),
    callbacks,
  );

export const useCreateStockPurchaseRequest = (
  callbacks?: MutationCallbacks<NoData, CreateStockPurchaseRequestBody>,
) =>
  useProductionMutation(
    'createStockPurchaseRequest',
    (body: CreateStockPurchaseRequestBody) => createStockPurchaseRequest(body),
    () => PRODUCTION_MUTATION_EFFECTS.createStockPurchaseRequest(),
    callbacks,
  );

export const useConvertMrpOrders = (
  callbacks?: MutationCallbacks<unknown, MrpOrdersConvertReqeustBody>,
) =>
  useProductionMutation(
    'convertMrpOrders',
    (body: MrpOrdersConvertReqeustBody) => postMrpConvert(body),
    () => PRODUCTION_MUTATION_EFFECTS.convertMrpOrders(),
    callbacks,
  );

export const useConfirmQuotations = (callbacks?: MutationCallbacks<null, string[]>) =>
  useProductionMutation(
    'confirmQuotations',
    (quotationIds: string[]) => fetchQuotationConfirm(quotationIds),
    () => PRODUCTION_MUTATION_EFFECTS.confirmQuotations(),
    callbacks,
  );

type MesResult = ApiResponse<void>;

export const useStartMes = (callbacks?: MutationCallbacks<MesResult, string>) =>
  useProductionMutation(
    'startMes',
    (mesId: string) => startMes(mesId),
    (mesId) => PRODUCTION_MUTATION_EFFECTS.startMes(mesId),
    callbacks,
  );

export const useCompleteMes = (callbacks?: MutationCallbacks<MesResult, string>) =>
  useProductionMutation(
    'completeMes',
    (mesId: string) => completeMes(mesId),
    (mesId) => PRODUCTION_MUTATION_EFFECTS.completeMes(mesId),
    callbacks,
  );

export interface MesOperationVariables {
  mesId: string;
  operationId: string;
}
export const useStartMesOperation = (
  callbacks?: MutationCallbacks<MesResult, MesOperationVariables>,
) =>
  useProductionMutation(
    'startMesOperation',
    ({ mesId, operationId }: MesOperationVariables) => startMesOperation(mesId, operationId),
    ({ mesId }) => PRODUCTION_MUTATION_EFFECTS.startMesOperation(mesId),
    callbacks,
  );

export const useCompleteMesOperation = (
  callbacks?: MutationCallbacks<MesResult, MesOperationVariables>,
) =>
  useProductionMutation(
    'completeMesOperation',
    ({ mesId, operationId }: MesOperationVariables) => completeMesOperation(mesId, operationId),
    ({ mesId }) => PRODUCTION_MUTATION_EFFECTS.completeMesOperation(mesId),
    callbacks,
  );

/** 견적 시뮬레이션. 결과(제안 납기)를 돌려주고 견적 목록을 다시 가져온다 */
export const useSimulateQuotations = (
  callbacks?: MutationCallbacks<QuotationSimulationResponse['content'], string[]>,
) =>
  useProductionMutation(
    'simulateQuotations',
    (quotationIds: string[]) => simulateQuotations(quotationIds),
    () => PRODUCTION_MUTATION_EFFECTS.simulateQuotations(),
    callbacks,
  );
