// services/purchase.ts
import { createStatCard } from '@/lib/CreateStatCard';
import { type Stat, type StatCardType } from '@/app/types/StatType';
import type financeKo from '@/i18n/messages/finance/ko.json';
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
