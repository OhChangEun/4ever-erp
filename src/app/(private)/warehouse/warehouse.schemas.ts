import * as z from 'zod/mini';
import type { WarehouseDetailResponse } from './types/WarehouseDetailModalType';
import type { WarehouseManagerInfoResponse } from './types/AddWarehouseModalType';

/**
 * 창고 GET 응답 스키마(타입 4차 카드). 화면이 null 가드를 두던 읽기만 확인한다.
 * 스키마는 기존 타입에 묶여 있어 타입이 바뀌면 여기도 컴파일 오류로 같이 고친다.
 */

export const warehouseDetailSchema: z.ZodMiniType<WarehouseDetailResponse> = z.looseObject({
  warehouseInfo: z.looseObject({
    warehouseName: z.nullish(z.string()),
    warehouseNumber: z.string(),
    warehouseType: z.string(),
    statusCode: z.string(),
    location: z.nullish(z.string()),
    description: z.nullish(z.string()),
  }),
  manager: z.looseObject({
    managerId: z.string(),
    managerName: z.nullish(z.string()),
    managerPhoneNumber: z.nullish(z.string()),
    managerEmail: z.nullish(z.string()),
  }),
});

const warehouseManagerSchema: z.ZodMiniType<WarehouseManagerInfoResponse> = z.looseObject({
  managerId: z.string(),
  managerName: z.string(),
  managerPhone: z.string(),
  managerEmail: z.string(),
});

/** 창고 담당자 선택 목록 */
export const warehouseManagerListSchema = z.array(warehouseManagerSchema);
