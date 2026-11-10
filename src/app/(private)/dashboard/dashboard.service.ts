import { StatCardType } from '@/app/types/StatType';
import { DashboardStatRes } from './types/DashboardStatsType';
import { createStatCard } from '@/lib/CreateStatCard';

export const mapDashboardStatsToCards = (
  data: DashboardStatRes,
): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '총 매출',
        stats.total_sales.value,
        stats.total_sales.delta_rate,
        '₩',
        stats.total_sales.trend,
      ),
      createStatCard(
        '총 매입',
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
      createStatCard(
        '총 직원 수',
        stats.total_employees.value,
        stats.total_employees.delta_rate,
        '명',
        stats.total_employees.trend,
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};
