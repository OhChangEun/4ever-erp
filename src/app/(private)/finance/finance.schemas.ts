import * as z from 'zod/mini';
import { periodStatsSchema, statSchema } from '@/lib/api/schemas';
import type { CustomerSupplierStatResponse } from './types/FinanceStatsType';
import type { InvoicetDetailRes } from './types/InvoiceDetailModalType';

/**
 * 재무 GET 응답 스키마(타입 4차 카드). 화면이 null 가드를 두던 읽기만 확인한다.
 * 스키마는 기존 타입에 묶여 있어 타입이 바뀌면 여기도 컴파일 오류로 같이 고친다.
 */

/** 고객사, 공급사 통계. 네 기간이 다 있어야 한다 */
export const customerSupplierStatsSchema: z.ZodMiniType<CustomerSupplierStatResponse> =
  periodStatsSchema(z.looseObject({ total_amount: statSchema }));

/** 매출(AR), 매입(AP) 전표 상세. 두 엔드포인트가 같은 모양이다 */
export const invoiceDetailSchema: z.ZodMiniType<InvoicetDetailRes> = z.looseObject({
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  invoiceType: z.string(),
  statusCode: z.string(),
  issueDate: z.string(),
  dueDate: z.string(),
  name: z.string(),
  referenceNumber: z.string(),
  totalAmount: z.number(),
  note: z.string(),
  items: z.array(
    z.looseObject({
      itemId: z.string(),
      itemName: z.string(),
      quantity: z.number(),
      unitOfMaterialName: z.string(),
      unitPrice: z.number(),
      totalPrice: z.number(),
    }),
  ),
});
