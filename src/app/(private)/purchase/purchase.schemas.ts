import { z } from 'zod';
import { pageSchema, periodStatsSchema, statSchema } from '@/lib/api/schemas';
import type { PurchaseStatResponse, SupplierPurchaseStatResponse } from './types/PurchaseStatsType';
import type {
  PurchaseOrderDetail,
  PurchaseOrderListResponse,
  PurchaseOrderStatus,
} from './types/PurchaseOrderType';
import type {
  PurchaseRequestDetail,
  PurchaseRequestListResponse,
} from './types/PurchaseRequestType';
import type {
  SupplierCategory,
  SupplierDetail,
  SupplierInfo,
  SupplierListResponse,
  SupplierStatus,
} from './types/SupplierType';

/**
 * 구매 GET 응답 스키마(타입 2차 카드). 기존 타입에 묶여 있어 타입과 어긋나면 컴파일 오류가 난다.
 * 객체는 looseObject 라 모르는 필드를 지우지 않는다.
 */

const PURCHASE_ORDER_STATUSES = [
  'APPROVAL',
  'PENDING',
  'REJECTED',
  'DELIVERING',
  'DELIVERED',
] as const satisfies readonly PurchaseOrderStatus[];
const SUPPLIER_STATUSES = ['ACTIVE', 'INACTIVE'] as const satisfies readonly SupplierStatus[];
const SUPPLIER_CATEGORIES = [
  'MATERIAL',
  'PARTS',
  'ETC',
] as const satisfies readonly SupplierCategory[];

export const purchaseStatsSchema: z.ZodType<PurchaseStatResponse> = periodStatsSchema(
  z.looseObject({ purchaseOrderAmount: statSchema, purchaseRequestCount: statSchema }),
);

export const supplierPurchaseStatsSchema: z.ZodType<SupplierPurchaseStatResponse> =
  periodStatsSchema(z.looseObject({ orderCount: statSchema }));

export const purchaseRequestListSchema: z.ZodType<PurchaseRequestListResponse> = z.looseObject({
  content: z.array(
    z.looseObject({
      purchaseRequisitionId: z.string(),
      purchaseRequisitionNumber: z.string(),
      requesterId: z.string(),
      requesterName: z.string(),
      departmentId: z.string(),
      departmentName: z.string(),
      statusCode: z.string(),
      requestDate: z.string(),
      totalAmount: z.number(),
    }),
  ),
  page: pageSchema,
});

export const purchaseRequestDetailSchema: z.ZodType<PurchaseRequestDetail> = z.looseObject({
  id: z.string(),
  purchaseRequisitionNumber: z.string(),
  requesterId: z.string(),
  requesterName: z.string(),
  departmentId: z.string(),
  departmentName: z.string(),
  requestDate: z.string(),
  statusCode: z.string(),
  items: z.array(
    z.looseObject({
      itemId: z.number(),
      itemName: z.string(),
      dueDate: z.string(),
      quantity: z.number(),
      uomCode: z.string(),
      unitPrice: z.number(),
      amount: z.number(),
    }),
  ),
  totalAmount: z.number(),
});

export const purchaseOrderListSchema: z.ZodType<PurchaseOrderListResponse> = z.looseObject({
  content: z.array(
    z.looseObject({
      purchaseOrderId: z.string(),
      purchaseOrderNumber: z.string(),
      supplierName: z.string(),
      itemsSummary: z.string(),
      orderDate: z.string(),
      dueDate: z.string(),
      totalAmount: z.number(),
      statusCode: z.enum(PURCHASE_ORDER_STATUSES),
    }),
  ),
  page: pageSchema,
});

export const purchaseOrderDetailSchema: z.ZodType<PurchaseOrderDetail> = z.looseObject({
  statusCode: z.string(),
  dueDate: z.string(),
  purchaseOrderId: z.string(),
  purchaseOrderNumber: z.string(),
  orderDate: z.string(),
  supplierId: z.string(),
  supplierNumber: z.string(),
  supplierName: z.string(),
  managerPhone: z.string(),
  managerEmail: z.string(),
  items: z.array(
    z.looseObject({
      itemId: z.string(),
      itemName: z.string(),
      quantity: z.number(),
      uomName: z.string(),
      unitPrice: z.number(),
      totalPrice: z.number(),
    }),
  ),
  totalAmount: z.number(),
  note: z.string(),
});

const supplierInfoSchema: z.ZodType<SupplierInfo> = z.looseObject({
  supplierId: z.string(),
  supplierName: z.string(),
  supplierNumber: z.string(),
  supplierEmail: z.string(),
  supplierPhone: z.string(),
  supplierBaseAddress: z.string(),
  supplierDetailAddress: z.string().nullable(),
  supplierStatusCode: z.enum(SUPPLIER_STATUSES),
  category: z.enum(SUPPLIER_CATEGORIES),
  deliveryLeadTime: z.number(),
});

export const supplierListSchema: z.ZodType<SupplierListResponse> = z.looseObject({
  content: z.array(z.looseObject({ statusCode: z.string(), supplierInfo: supplierInfoSchema })),
  page: pageSchema,
});

export const supplierDetailSchema: z.ZodType<SupplierDetail> = z.looseObject({
  supplierInfo: supplierInfoSchema,
  managerInfo: z.looseObject({
    managerName: z.string(),
    managerPhone: z.string(),
    managerEmail: z.string(),
  }),
});
