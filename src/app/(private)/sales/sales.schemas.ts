import * as z from 'zod/mini';
import { pageSchema, periodStatsSchema, statSchema } from '@/lib/api/schemas';
import type { CustomerSalesStatResponse, SalesStatResponse } from './types/SalesStatsType';
import type { Quote, QuoteStatus } from './types/SalesQuoteListType';
import type { QuoteDetail } from './types/QuoteDetailModalType';
import type { Order, OrderStatus } from './types/SalesOrderListType';
import type { OrderDetail } from './types/SalesOrderDetailType';
import type { SalesCustomer } from './types/SalesCustomerListType';
import type { CustomerDetail } from './types/SalesCustomerDetailType';
import type { SalesAnalysis } from './types/SalesChartType';
import type { ItemResponse } from './types/NewOrderModalType';

/**
 * 영업 GET 응답 스키마(타입 2차 카드). 각 스키마는 기존 타입에 묶여 있어(`z.ZodMiniType<기존 타입>`)
 * 타입을 고치면 여기도 컴파일 오류로 같이 고치게 된다. 객체는 looseObject 라 모르는 필드를 지우지 않는다.
 */

const QUOTE_STATUSES = [
  'ALL',
  'APPROVED',
  'APPROVAL',
  'REVIEW',
  'PENDING',
  'REJECTED',
] as const satisfies readonly QuoteStatus[];
const ORDER_STATUSES = [
  'ALL',
  'MATERIAL_PREPARATION',
  'IN_PRODUCTION',
  'READY_FOR_SHIPMENT',
  'DELIVERING',
  'DELIVERED',
] as const satisfies readonly OrderStatus[];

const managerSchema = z.looseObject({
  managerName: z.string(),
  managerPhone: z.string(),
  managerEmail: z.string(),
});

export const salesStatsSchema: z.ZodMiniType<SalesStatResponse> = periodStatsSchema(
  z.looseObject({ sales_amount: statSchema, new_orders_count: statSchema }),
);

export const customerSalesStatsSchema: z.ZodMiniType<CustomerSalesStatResponse> = periodStatsSchema(
  z.looseObject({ quotation_count: statSchema }),
);

const quoteSchema: z.ZodMiniType<Quote> = z.looseObject({
  quotationId: z.string(),
  quotationNumber: z.string(),
  customerName: z.string(),
  managerName: z.string(),
  quotationDate: z.string(),
  dueDate: z.string(),
  totalAmount: z.number(),
  statusCode: z.string(),
});

export const quoteListSchema = z.looseObject({ content: z.array(quoteSchema), page: pageSchema });

export const quoteDetailSchema: z.ZodMiniType<QuoteDetail> = z.looseObject({
  quotationId: z.string(),
  quotationNumber: z.string(),
  quotationDate: z.string(),
  dueDate: z.string(),
  statusCode: z.enum(QUOTE_STATUSES),
  customerName: z.string(),
  ceoName: z.string(),
  items: z.array(
    z.looseObject({
      itemId: z.string(),
      itemName: z.string(),
      quantity: z.number(),
      uomName: z.string(),
      unitPrice: z.number(),
      amount: z.number(),
    }),
  ),
  totalAmount: z.number(),
});

const orderSchema: z.ZodMiniType<Order> = z.looseObject({
  salesOrderId: z.string(),
  salesOrderNumber: z.string(),
  customerName: z.string(),
  manager: managerSchema,
  orderDate: z.string(),
  dueDate: z.string(),
  totalAmount: z.number(),
  statusCode: z.enum(ORDER_STATUSES),
});

export const orderListSchema = z.looseObject({ content: z.array(orderSchema), page: pageSchema });

export const orderDetailSchema: z.ZodMiniType<OrderDetail> = z.looseObject({
  order: z.looseObject({
    salesOrderId: z.string(),
    salesOrderNumber: z.string(),
    orderDate: z.string(),
    dueDate: z.string(),
    statusCode: z.enum(ORDER_STATUSES),
    totalAmount: z.number(),
  }),
  // 게이트웨이 OrderCustomerDto.java:11. customerId 는 문자열이고 customerCode 는 없다
  customer: z.looseObject({
    customerId: z.string(),
    customerName: z.string(),
    customerBaseAddress: z.string(),
    customerDetailAddress: z.string(),
    manager: managerSchema,
  }),
  items: z.array(
    z.looseObject({
      itemId: z.string(),
      itemName: z.string(),
      quantity: z.number(),
      uonName: z.string(),
      unitPrice: z.number(),
      amount: z.number(),
    }),
  ),
  note: z.nullish(z.string()),
});

const salesCustomerSchema: z.ZodMiniType<SalesCustomer> = z.looseObject({
  customerId: z.string(),
  customerNumber: z.string(),
  customerName: z.string(),
  manager: managerSchema,
  address: z.string(),
  totalTransactionAmount: z.number(),
  orderCount: z.number(),
  lastOrderDate: z.string(),
  statusCode: z.string(),
});

export const customerListSchema = z.looseObject({
  customers: z.array(salesCustomerSchema),
  page: pageSchema,
});

export const customerDetailSchema: z.ZodMiniType<CustomerDetail> = z.looseObject({
  customerId: z.string(),
  customerNumber: z.string(),
  customerName: z.string(),
  ceoName: z.string(),
  businessNumber: z.string(),
  statusCode: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string(),
  baseAddress: z.string(),
  detailAddress: z.string(),
  manager: managerSchema,
  totalOrders: z.number(),
  totalTransactionAmount: z.number(),
  note: z.string(),
});

const minMaxSchema = z.looseObject({ min: z.number(), max: z.number() });

export const salesAnalysisSchema: z.ZodMiniType<SalesAnalysis> = z.looseObject({
  period: z.looseObject({
    start: z.string(),
    end: z.string(),
    weekStart: z.string(),
    weekEnd: z.string(),
    weekCount: z.number(),
  }),
  trend: z.array(
    z.looseObject({
      year: z.number(),
      month: z.number(),
      week: z.number(),
      sale: z.number(),
      orderCount: z.number(),
    }),
  ),
  trendScale: z.looseObject({ sale: minMaxSchema, orderCount: minMaxSchema }),
  productShare: z.array(
    z.looseObject({
      productCode: z.string(),
      productName: z.string(),
      sale: z.number(),
      saleShare: z.number(),
    }),
  ),
  // 게이트웨이 TopCustomerDto.java:15. 고객 번호 이름은 customerNumber
  topCustomers: z.array(
    z.looseObject({
      customerNumber: z.string(),
      customerName: z.string(),
      orderCount: z.number(),
      sale: z.number(),
      active: z.boolean(),
    }),
  ),
});

const itemResponseSchema: z.ZodMiniType<ItemResponse> = z.looseObject({
  itemId: z.string(),
  itemNumber: z.string(),
  itemName: z.string(),
  uomName: z.string(),
  unitPrice: z.number(),
});

export const newQuoteItemsSchema = z.looseObject({ products: z.array(itemResponseSchema) });
