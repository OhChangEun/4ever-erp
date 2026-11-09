import type { QueryKey } from '@tanstack/react-query';
import {
  optimisticPatch,
  useInvalidatingMutation,
  type MutationCallbacks,
} from '@/lib/query/useInvalidatingMutation';
import {
  PatchSafetyStock,
  patchMarkAsReadyToShip,
  postAddMaterial,
  postStockMovement,
} from './inventory.api';
import {
  inventoryKeys,
  inventoryStatsKeys,
  lowStockItemKeys,
  shippingKeys,
  stockMovementKeys,
  warehouseInfoKeys,
} from './inventory.keys';
import { lowStockKeys, lowStockStatsKeys } from '@/app/(private)/low-stock';
import { createStockPurchaseRequest } from '@/app/(private)/purchase';
import { purchaseRequestKeys, purchaseStatsKeys } from '@/app/(private)/purchase';
import { salesOrderKeys } from '@/app/(private)/sales';
import type {
  markAsReadyRequest,
  markAsReadyToShipResponse,
} from './types/ShippingDetailModalType';
import type { CreateStockPurchaseRequestItem } from '@/app/(private)/purchase';
import type { AddInventoryItemsRequest } from './types/AddInventoryModalType';
import type {
  InventoryDetailResponse,
  StockMovementRequest,
} from './types/InventoryDetailModalType';
import type { InventoryResponse } from './types/InventoryListType';
import type { ApiResponse, ApiResponseNoData } from '@/app/types/api';
import type { Page } from '@/app/types/Page';

/**
 * 재고 도메인 mutation → 다시 가져올 쿼리 키. 이 표가 동작이다.
 * 부족 재고는 화면이 셋이다. 재고 탭 위젯(`lowStockItemKeys`), 부족 재고 페이지 목록과 통계(`lowStockKeys`,
 * `lowStockStatsKeys`). 재고량이나 안전재고가 바뀌면 셋 다 다시 가져온다.
 */
const LOW_STOCK_ALL: readonly QueryKey[] = [
  lowStockItemKeys.all,
  lowStockKeys.lists(),
  lowStockStatsKeys.all,
];

export const INVENTORY_MUTATION_EFFECTS = {
  // 출하 준비는 영업 주문 상태를 바꾼다(API 경로 sales-orders/:id/status). 영업 주문 키는 의도한 교차
  markReadyToShip: (orderId: string): readonly QueryKey[] => [
    shippingKeys.all,
    inventoryStatsKeys.all,
    salesOrderKeys.lists(),
    salesOrderKeys.detail(orderId),
  ],
  // 부족 재고 페이지에서 구매 요청. 구매 키 2개는 의도한 교차(구매 데이터를 만든다).
  requestPurchaseForLowStock: (): readonly QueryKey[] => [
    lowStockKeys.lists(),
    lowStockItemKeys.all,
    purchaseRequestKeys.lists(),
    purchaseStatsKeys.all,
  ],
  addMaterial: (): readonly QueryKey[] => [inventoryKeys.lists(), inventoryStatsKeys.all],
  updateSafetyStock: (itemId: string): readonly QueryKey[] => [
    inventoryKeys.detail(itemId),
    inventoryKeys.lists(),
    ...LOW_STOCK_ALL,
  ],
  moveStock: (itemId: string): readonly QueryKey[] => [
    inventoryKeys.detail(itemId),
    inventoryKeys.lists(),
    stockMovementKeys.all,
    warehouseInfoKeys.all,
    ...LOW_STOCK_ALL,
  ],
} as const;

export type InventoryMutationName = keyof typeof INVENTORY_MUTATION_EFFECTS;
export const inventoryMutationKey = (name: InventoryMutationName) =>
  ['inventory', 'mutation', name] as const;

type InventoryListCache = { data: InventoryResponse[]; pageData: Page };

/** 안전재고 수정과 재고 이동은 같은 상세와 목록 캐시를 고친다. 겹치면 한 줄로 선다(리뷰 A1) */
const STOCK_OPTIMISTIC_SCOPE = 'inventory-stock';

export const useRequestPurchaseForLowStock = (
  callbacks?: MutationCallbacks<ApiResponse<null>, CreateStockPurchaseRequestItem[]>,
) =>
  useInvalidatingMutation<ApiResponse<null>, CreateStockPurchaseRequestItem[]>({
    mutationKey: inventoryMutationKey('requestPurchaseForLowStock'),
    mutationFn: (items) => createStockPurchaseRequest({ items }),
    effects: () => INVENTORY_MUTATION_EFFECTS.requestPurchaseForLowStock(),
    callbacks,
  });

/** 자재 추가. 생성이라 낙관적 업데이트를 하지 않는다(결정 7, 서버가 행을 정한다) */
export const useAddMaterial = (
  callbacks?: MutationCallbacks<ApiResponseNoData, AddInventoryItemsRequest>,
) =>
  useInvalidatingMutation<ApiResponseNoData, AddInventoryItemsRequest>({
    mutationKey: inventoryMutationKey('addMaterial'),
    mutationFn: (body) => postAddMaterial(body),
    effects: () => INVENTORY_MUTATION_EFFECTS.addMaterial(),
    callbacks,
  });

export interface UpdateSafetyStockVariables {
  itemId: string;
  safetyStock: number;
}

/** 안전재고 수정. 상세와 목록 행(같은 itemId)의 safetyStock 을 응답 전에 바꾼다 */
export const useUpdateSafetyStock = (
  callbacks?: MutationCallbacks<ApiResponseNoData, UpdateSafetyStockVariables>,
) =>
  useInvalidatingMutation<ApiResponseNoData, UpdateSafetyStockVariables>({
    mutationKey: inventoryMutationKey('updateSafetyStock'),
    mutationFn: (variables) => PatchSafetyStock(variables),
    effects: ({ itemId }) => INVENTORY_MUTATION_EFFECTS.updateSafetyStock(itemId),
    optimisticScope: STOCK_OPTIMISTIC_SCOPE,
    optimistic: ({ itemId, safetyStock }) => [
      optimisticPatch<InventoryDetailResponse>(inventoryKeys.detail(itemId), (old) => ({
        ...old,
        safetyStock,
      })),
      optimisticPatch<InventoryListCache>(inventoryKeys.lists(), (old) => ({
        ...old,
        data: old.data.map((row) => (row.itemId === itemId ? { ...row, safetyStock } : row)),
      })),
    ],
    callbacks,
  });

/**
 * 재고 이동. 상세는 한 창고 기준이라 출발 창고의 상세만 현재고를 줄인다.
 * 도착 창고 쪽과 목록, 이동 기록은 서버 값을 기다린다(무효화).
 */
export const useMoveStock = (
  callbacks?: MutationCallbacks<ApiResponseNoData, StockMovementRequest>,
) =>
  useInvalidatingMutation<ApiResponseNoData, StockMovementRequest>({
    mutationKey: inventoryMutationKey('moveStock'),
    mutationFn: (body) => postStockMovement(body),
    effects: ({ itemId }) => INVENTORY_MUTATION_EFFECTS.moveStock(itemId),
    optimisticScope: STOCK_OPTIMISTIC_SCOPE,
    optimistic: ({ itemId, fromWarehouseId, stockQuantity }) => [
      optimisticPatch<InventoryDetailResponse>(inventoryKeys.detail(itemId), (old) =>
        old.warehouseId === fromWarehouseId
          ? { ...old, currentStock: old.currentStock - stockQuantity }
          : old,
      ),
    ],
    callbacks,
  });

export interface MarkReadyToShipVariables {
  orderId: string;
  itemIds: markAsReadyRequest;
}

/** 출하 준비 완료 처리. 생산 중과 출하 대기 목록, 재고 통계, 영업 주문을 다시 가져온다 */
export const useMarkReadyToShip = (
  callbacks?: MutationCallbacks<markAsReadyToShipResponse, MarkReadyToShipVariables>,
) =>
  useInvalidatingMutation<markAsReadyToShipResponse, MarkReadyToShipVariables>({
    mutationKey: inventoryMutationKey('markReadyToShip'),
    mutationFn: ({ orderId, itemIds }) => patchMarkAsReadyToShip(orderId, itemIds),
    effects: ({ orderId }) => INVENTORY_MUTATION_EFFECTS.markReadyToShip(orderId),
    callbacks,
  });
