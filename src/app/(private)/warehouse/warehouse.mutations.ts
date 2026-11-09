import type { QueryKey } from '@tanstack/react-query';
import {
  optimisticPatch,
  useInvalidatingMutation,
  type MutationCallbacks,
} from '@/lib/query/useInvalidatingMutation';
import { patchManageWarehouse, postAddWarehouse } from './warehouse.api';
import { warehouseKeys, warehouseStatsKeys } from './warehouse.keys';
import { warehouseInfoKeys } from '@/app/(private)/inventory/inventory.keys';
import type { AddWarehouseRequest } from './types/AddWarehouseModalType';
import type { EditWarehouseRequest } from './types/ManageWarehouseModalType';
import type { WarehouseListResponse } from './types/WarehouseListType';
import type { ApiResponseNoData } from '@/app/types/api';
import type { Page } from '@/app/types/Page';

/**
 * 창고 mutation → 다시 가져올 쿼리 키. 이 표가 동작이다.
 * 재고 화면의 창고 토글(`warehouseInfoKeys`)은 창고 이름과 목록을 보여주므로 같이 무효화한다
 * (창고는 재고 API 아래 `iv/warehouses` 에 있다. 같은 업무 영역).
 */
export const WAREHOUSE_MUTATION_EFFECTS = {
  addWarehouse: (): readonly QueryKey[] => [
    warehouseKeys.lists(),
    warehouseStatsKeys.all,
    warehouseInfoKeys.all,
  ],
  editWarehouse: (warehouseId: string): readonly QueryKey[] => [
    warehouseKeys.lists(),
    warehouseKeys.detail(warehouseId),
    warehouseStatsKeys.all, // 상태(운영, 중지)가 바뀌면 운영 중 창고 수가 바뀐다
    warehouseInfoKeys.all,
  ],
} as const;

export type WarehouseMutationName = keyof typeof WAREHOUSE_MUTATION_EFFECTS;
export const warehouseMutationKey = (name: WarehouseMutationName) =>
  ['warehouse', 'mutation', name] as const;

type WarehouseListCache = { data: WarehouseListResponse[]; pageData: Page };

/** 창고 등록. 생성이라 낙관적 업데이트를 하지 않는다(결정 7) */
export const useAddWarehouse = (
  callbacks?: MutationCallbacks<ApiResponseNoData, AddWarehouseRequest>,
) =>
  useInvalidatingMutation<ApiResponseNoData, AddWarehouseRequest>({
    mutationKey: warehouseMutationKey('addWarehouse'),
    mutationFn: (body) => postAddWarehouse(body),
    effects: () => WAREHOUSE_MUTATION_EFFECTS.addWarehouse(),
    callbacks,
  });

export interface EditWarehouseVariables {
  warehouseId: string;
  payload: EditWarehouseRequest;
}

/**
 * 창고 수정. 모든 목록 페이지에서 그 창고 행의 이름, 유형, 위치, 상태만 응답 전에 바꾼다.
 * 담당자 이름과 연락처는 서버가 managerId 로 채우므로 건드리지 않고 무효화로 받는다.
 */
export const useEditWarehouse = (
  callbacks?: MutationCallbacks<ApiResponseNoData, EditWarehouseVariables>,
) =>
  useInvalidatingMutation<ApiResponseNoData, EditWarehouseVariables>({
    mutationKey: warehouseMutationKey('editWarehouse'),
    mutationFn: (variables) => patchManageWarehouse(variables),
    effects: ({ warehouseId }) => WAREHOUSE_MUTATION_EFFECTS.editWarehouse(warehouseId),
    optimistic: ({ warehouseId, payload }) => [
      optimisticPatch<WarehouseListCache>(warehouseKeys.lists(), (old) => ({
        ...old,
        data: old.data.map((row) =>
          row.warehouseId === warehouseId
            ? {
                ...row,
                warehouseName: payload.warehouseName,
                warehouseType: payload.warehouseType,
                location: payload.location,
                statusCode: payload.warehouseStatusCode,
              }
            : row,
        ),
      })),
    ],
    callbacks,
  });
