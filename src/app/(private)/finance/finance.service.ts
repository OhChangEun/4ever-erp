// services/purchase.ts
import { createStatCard } from '@/lib/CreateStatCard';
import { type StatCardType } from '@/app/types/StatType';
import {
  type CustomerSupplierStatResponse,
  type FinanceStatResponse,
} from './types/FinanceStatsType';

// 변환 함수
export const mapFinanceStatsToCards = (
  data: FinanceStatResponse,
): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '총 매출 (AR)',
        stats.total_sales.value,
        stats.total_sales.delta_rate,
        '₩',
        stats.total_sales.trend,
      ),
      createStatCard(
        '총 매입 (AP)',
        stats.total_purchases.value,
        stats.total_purchases.delta_rate,
        '₩',
        stats.total_purchases.trend,
      ),
      createStatCard(
        '순이익',
        stats.net_profit.value,
        stats.net_profit.delta_rate,
        '₩',
        stats.net_profit.trend,
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};

export const mapCustomerSupplierStatsToCards = (
  data: CustomerSupplierStatResponse,
): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '매입 금액',
        stats.total_amount.value,
        stats.total_amount.delta_rate,
        '₩',
        stats.total_amount.trend,
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};
