import { createStatCard } from '@/lib/CreateStatCard';
import { type Stat, type StatCardType } from '@/app/types/StatType';
import {
  type CustomerSalesStatResponse,
  type SalesStatResponse,
} from '@/app/(private)/sales/types/SalesStatsType';
import type salesKo from '@/i18n/messages/sales/ko.json';

/**
 * 카드 제목은 메시지 키(sales.stats.<키>). 건수 카드 값은 단위 없이 둔다(단위 '건'은 sales.statCount).
 * 응답은 캐시에 남으니 글자는 그릴 때 바꾼다(언어를 바꿔도 다시 받지 않게)
 */
export type SalesStatTitle = keyof typeof salesKo.stats;
export interface SalesStatCard extends StatCardType {
  title: SalesStatTitle;
  /** count 면 화면이 단위를 붙인다. won 은 '₩' 가 이미 붙어 있다 */
  unit: 'count' | 'won';
}

const countCard = (title: SalesStatTitle, stat: Stat): SalesStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '', stat.trend),
  title,
  unit: 'count',
});

const wonCard = (title: SalesStatTitle, stat: Stat): SalesStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '₩', stat.trend),
  title,
  unit: 'won',
});

export const mapSalesStatsToCards = (data: SalesStatResponse): Record<string, SalesStatCard[]> => {
  return Object.entries(data).reduce<Record<string, SalesStatCard[]>>((acc, [period, stats]) => {
    acc[period] = [
      wonCard('salesAmount', stats.sales_amount),
      countCard('newOrders', stats.new_orders_count),
    ];
    return acc;
  }, {});
};

export const mapCustomerSalesStatsToCards = (
  data: CustomerSalesStatResponse,
): Record<string, SalesStatCard[]> => {
  return Object.entries(data).reduce<Record<string, SalesStatCard[]>>((acc, [period, stats]) => {
    acc[period] = [countCard('quotationCount', stats.quotation_count)];
    return acc;
  }, {});
};

/**
 * 검토 요청과 즉시 납품을 할 수 있는 견적 상태. 대기(PENDING) 하나다. 검토중(REVIEW)은 이미 검토 요청을 보냈고,
 * 승인과 반려는 끝난 견적이다. 모르는 값은 처리할 수 없는 쪽으로 본다(같은 쓰기를 두 번 보내지 않게).
 * verified=false: 게이트웨이 견적 응답은 Object(SdController.java:95), 상태 enum QuotationStatus 는 참조하는 곳이 없다
 */
export const canProcessQuote = (statusCode: string) => statusCode === 'PENDING';
