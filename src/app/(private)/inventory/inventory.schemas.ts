import * as z from 'zod/mini';
import { pageSchema } from '@/lib/api/schemas';
import type { AddInventoryItemsToggleResponse } from './types/AddInventoryModalType';
import type { InventoryDetailResponse } from './types/InventoryDetailModalType';
import type { InventoryResponse } from './types/InventoryListType';

/**
 * 재고 GET 응답 스키마(타입 4차 카드). 화면이 null 가드를 두던 읽기만 확인한다.
 * 스키마는 기존 타입에 묶여 있어 타입이 바뀌면 여기도 컴파일 오류로 같이 고친다.
 */

const inventorySchema: z.ZodMiniType<InventoryResponse> = z.looseObject({
  itemId: z.string(),
  itemNumber: z.string(),
  itemName: z.string(),
  category: z.string(),
  currentStock: z.number(),
  forShipmentStock: z.number(),
  reservedStock: z.number(),
  safetyStock: z.number(),
  uomName: z.string(),
  unitPrice: z.number(),
  totalAmount: z.number(),
  warehouseName: z.nullish(z.string()),
  warehouseType: z.string(),
  statusCode: z.string(),
  shelfNumber: z.optional(z.number()),
});

/** 재고 목록. 재고 화면과 창고 3D 화면이 같이 쓴다 */
export const inventoryListSchema = z.looseObject({
  content: z.array(inventorySchema),
  page: pageSchema,
});

export const inventoryDetailSchema: z.ZodMiniType<InventoryDetailResponse> = z.looseObject({
  itemId: z.string(),
  itemNumber: z.string(),
  itemName: z.string(),
  category: z.string(),
  supplierCompanyName: z.string(),
  statusCode: z.string(),
  currentStock: z.number(),
  safetyStock: z.number(),
  uomName: z.string(),
  unitPrice: z.number(),
  totalAmount: z.number(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  warehouseNumber: z.string(),
  location: z.string(),
  lastModified: z.nullish(z.string()),
  description: z.string(),
  stockMovement: z.array(
    z.looseObject({
      type: z.string(),
      quantity: z.number(),
      uomName: z.string(),
      from: z.string(),
      to: z.string(),
      movementDate: z.string(),
      managerName: z.string(),
      referenceNumber: z.string(),
      note: z.string(),
    }),
  ),
});

const addInventoryItemSchema: z.ZodMiniType<AddInventoryItemsToggleResponse> = z.looseObject({
  itemId: z.string(),
  unitPrice: z.number(),
  supplierCompanyName: z.string(),
  uomName: z.string(),
  supplierCompanyId: z.string(),
  itemName: z.string(),
});

/** 재고 추가 모달의 품목 선택 목록 */
export const addInventoryItemsSchema = z.array(addInventoryItemSchema);
