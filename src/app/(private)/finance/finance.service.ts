// services/purchase.ts
import { createStatCard } from '@/lib/CreateStatCard';
import { type Stat, type StatCardType } from '@/app/types/StatType';
import type financeKo from '@/i18n/messages/finance/ko.json';
import type { InvoiceAction } from './finance.mutations';
import {
  type CustomerSupplierStatResponse,
  type FinanceStatResponse,
} from './types/FinanceStatsType';

/** 카드 제목은 메시지 키(finance.stats.<키>). 응답은 캐시에 남으니 글자는 그릴 때 바꾼다(언어를 바꿔도 다시 받지 않게) */
export type FinanceStatTitle = keyof typeof financeKo.stats;
export interface FinanceStatCard extends StatCardType {
  title: FinanceStatTitle;
}

const wonCard = (title: FinanceStatTitle, stat: Stat): FinanceStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '₩', stat.trend),
  title,
});

// 변환 함수
export const mapFinanceStatsToCards = (
  data: FinanceStatResponse,
): Record<string, FinanceStatCard[]> => {
  return Object.entries(data).reduce<Record<string, FinanceStatCard[]>>((acc, [period, stats]) => {
    acc[period] = [
      wonCard('totalSales', stats.total_sales),
      wonCard('totalPurchases', stats.total_purchases),
      wonCard('netProfit', stats.net_profit),
    ];
    return acc;
  }, {});
};

export const mapCustomerSupplierStatsToCards = (
  data: CustomerSupplierStatResponse,
): Record<string, FinanceStatCard[]> => {
  return Object.entries(data).reduce<Record<string, FinanceStatCard[]>>((acc, [period, stats]) => {
    acc[period] = [wonCard('purchaseAmount', stats.total_amount)];
    return acc;
  }, {});
};

/**
 * 처리 요청을 보낼 수 있는 전표 상태. 매출(ar)과 공급사(supplierAp)는 수금, 지급 완료, 사내 매입(ap)은 공급사에 처리 요청.
 * 화면이 예전부터 열어 두던 아는 값만 남겼다. 모르는 값은 처리할 수 없는 쪽으로 본다(같은 쓰기를 두 번 보내지 않게).
 * verified=false: 게이트웨이가 전표 응답을 Object 로 넘긴다. 매출 완료 설명은 "미납/확인요청 상태"(FcmController.java:178)
 */
const PROCESSABLE_INVOICE_STATUS: Record<InvoiceAction, readonly string[]> = {
  ar: ['PENDING', 'RESPONSE_PENDING'],
  supplierAp: ['PENDING', 'RESPONSE_PENDING'],
  // RESPONSE_PENDING: 공급사가 매입 전표를 이 값으로 바꾸는 API 가 있고(FcmController.java:247-250) 예전 화면도 열어 두었다.
  // 응답 대기 뒤 사내가 처리하는 흐름으로 본다(verified=false)
  ap: ['UNPAID', 'RESPONSE_PENDING'],
};

export const canProcessInvoice = (action: InvoiceAction, statusCode: string) =>
  PROCESSABLE_INVOICE_STATUS[action].includes(statusCode);
