import * as z from 'zod/mini';
import { pageSchema, periodStatsSchema, statSchema } from '@/lib/api/schemas';
import type { AvailableStockStatus } from './constants';
import type { ProductionStatResponse } from './types/ProductionStatsType';
import type { QuotationListResponse } from './types/QuotationApiType';
import type { QuotationSimulationResponse } from './types/QuotationSimulationApiType';
import type { MpsListResponse } from './types/MpsApiType';
import type { BomListResponse } from './types/BomListApiType';
import type { BomDetailResponse } from './types/BomDetailApiType';
import type { MaterialResponse } from './types/BomType';
import type { MrpOrdersListResponse } from './types/MrpOrdersApiType';
import type { MrpPlannedOrdersListResponse } from './types/MrpPlannedOrdersListApiType';
import type { MesListResponse } from './types/MesListApiType';
import type { MesDetailResponse } from './types/MesDetailApiType';

/**
 * 생산 GET 응답 스키마(타입 2차 카드). 견적 시뮬레이션은 POST 지만 화면이 읽는 응답이라 같이 확인한다.
 * 기존 타입에 묶여 있어 타입과 어긋나면 컴파일 오류가 난다. 객체는 looseObject.
 */

const AVAILABLE_STOCK_STATUSES = [
  'ALL',
  'CHECKED',
  'UNCHECKED',
] as const satisfies readonly AvailableStockStatus[];

export const productionStatsSchema: z.ZodMiniType<ProductionStatResponse> = periodStatsSchema(
  z.looseObject({
    production_in: statSchema,
    production_completed: statSchema,
    bom_count: statSchema,
  }),
);

export const quotationListSchema: z.ZodMiniType<QuotationListResponse> = z.looseObject({
  content: z.array(
    z.looseObject({
      quotationId: z.string(),
      quotationNumber: z.string(),
      customerName: z.string(),
      productName: z.string(),
      requestDate: z.string(),
      dueDate: z.nullish(z.string()),
      availableStatus: z.enum(AVAILABLE_STOCK_STATUSES),
      items: z.optional(
        z.array(
          z.looseObject({
            productId: z.string(),
            productName: z.string(),
            quantity: z.number(),
            uomName: z.string(),
            unitPrice: z.number(),
          }),
        ),
      ),
    }),
  ),
  page: pageSchema,
});

export const quotationSimulationSchema: z.ZodMiniType<QuotationSimulationResponse> = z.looseObject({
  page: pageSchema,
  content: z.array(
    z.looseObject({
      quotationId: z.string(),
      quotationNumber: z.string(),
      customerCompanyId: z.string(),
      customerCompanyName: z.string(),
      productId: z.string(),
      productName: z.string(),
      requestQuantity: z.number(),
      requestDueDate: z.number(),
      simulation: z.looseObject({
        status: z.string(),
        availableQuantity: z.number(),
        shortageQuantity: z.number(),
        shortageReason: z.optional(z.string()),
        suggestedDueDate: z.string(),
        generatedAt: z.string(),
      }),
    }),
  ),
});

export const mpsListSchema: z.ZodMiniType<MpsListResponse> = z.looseObject({
  bomId: z.string(),
  productName: z.string(),
  content: z.array(
    z.looseObject({
      week: z.string(),
      // 수량이지만 zod 전 화면이 네 칸 모두 `?? '-'` 로 막았다. 주가 비어도 탭 전체를 막지 않는다(남은 표시 결함 3)
      demand: z.nullish(z.number()),
      requiredInventory: z.nullish(z.number()),
      productionNeeded: z.nullish(z.number()),
      plannedProduction: z.nullish(z.number()),
    }),
  ),
  page: pageSchema,
});

export const bomListSchema: z.ZodMiniType<BomListResponse> = z.looseObject({
  page: pageSchema,
  content: z.array(
    z.looseObject({
      bomId: z.string(),
      bomNumber: z.string(),
      productId: z.string(),
      productNumber: z.string(),
      productName: z.string(),
      version: z.string(),
      statusCode: z.string(),
      lastModifiedAt: z.string(),
    }),
  ),
});

export const materialSchema: z.ZodMiniType<MaterialResponse> = z.looseObject({
  productId: z.string(),
  productName: z.string(),
  category: z.string(),
  productNumber: z.string(),
  uomName: z.string(),
  unitPrice: z.number(),
  supplierName: z.string(),
});

export const bomDetailSchema: z.ZodMiniType<BomDetailResponse> = z.looseObject({
  bomId: z.string(),
  bomNumber: z.string(),
  productId: z.string(),
  productNumber: z.string(),
  productName: z.string(),
  version: z.string(),
  statusCode: z.string(),
  lastModifiedAt: z.string(),
  components: z.array(
    z.looseObject({
      itemId: z.string(),
      code: z.string(),
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      level: z.string(),
      supplierName: z.string(),
      operationId: z.string(),
      operationName: z.string(),
      componentType: z.string(),
    }),
  ),
  levelStructure: z.array(
    z.looseObject({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      quantity: z.nullable(z.number()),
      unit: z.nullable(z.string()),
      level: z.number(),
      parentId: z.nullable(z.string()),
    }),
  ),
  routing: z.array(
    z.looseObject({
      itemName: z.string(),
      sequence: z.number(),
      operationName: z.string(),
      runTime: z.number(),
    }),
  ),
});

export const mrpOrdersListSchema: z.ZodMiniType<MrpOrdersListResponse> = z.looseObject({
  content: z.array(
    z.looseObject({
      quotationId: z.string(),
      itemId: z.string(),
      itemName: z.string(),
      requiredQuantity: z.number(),
      currentStock: z.number(),
      reservedStock: z.number(),
      actualAvailableStock: z.number(),
      safetyStock: z.number(),
      availableStock: z.number(),
      availableStatusCode: z.string(),
      shortageQuantity: z.number(),
      consumptionQuantity: z.number(),
      itemType: z.string(),
      procurementStartDate: z.nullish(z.string()),
      expectedArrivalDate: z.nullish(z.string()),
      supplierCompanyName: z.string(),
      convertStatus: z.string(),
    }),
  ),
  page: pageSchema,
});

export const mrpPlannedOrdersListSchema: z.ZodMiniType<MrpPlannedOrdersListResponse> =
  z.looseObject({
    page: pageSchema,
    content: z.array(
      z.looseObject({
        mrpRunId: z.string(),
        quotationNumber: z.string(),
        itemId: z.string(),
        itemName: z.string(),
        quantity: z.number(),
        status: z.string(),
        procurementStartDate: z.string(),
        expectedArrivalDate: z.string(),
      }),
    ),
  });

export const mesListSchema: z.ZodMiniType<MesListResponse> = z.looseObject({
  content: z.array(
    z.looseObject({
      mesId: z.string(),
      mesNumber: z.string(),
      productId: z.string(),
      productName: z.string(),
      quantity: z.number(),
      uomName: z.string(),
      quotationId: z.string(),
      quotationNumber: z.string(),
      status: z.string(),
      currentOperation: z.number(),
      startDate: z.string(),
      endDate: z.string(),
      progressRate: z.number(),
      sequence: z.array(z.string()),
    }),
  ),
  page: pageSchema,
});

export const mesDetailSchema: z.ZodMiniType<MesDetailResponse> = z.looseObject({
  mesId: z.string(),
  mesNumber: z.string(),
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  uomName: z.string(),
  progressPercent: z.number(),
  statusCode: z.string(),
  plan: z.looseObject({ startDate: z.string(), dueDate: z.string() }),
  currentOperation: z.string(),
  operations: z.array(
    z.looseObject({
      mesOperationLogId: z.string(),
      operationNumber: z.string(),
      operationName: z.string(),
      sequence: z.number(),
      statusCode: z.string(),
      startedAt: z.nullish(z.string()),
      finishedAt: z.nullish(z.string()),
      durationHours: z.number(),
      manager: z.nullish(z.looseObject({ id: z.number(), name: z.nullish(z.string()) })),
      canStart: z.boolean(),
      canComplete: z.boolean(),
    }),
  ),
  canStartMes: z.boolean(),
  canCompleteMes: z.boolean(),
});
