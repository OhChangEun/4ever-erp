import { type Stat, type StatCardType } from '@/app/types/StatType';
import type dashboardKo from '@/i18n/messages/dashboard/ko.json';
import { type DashboardStatRes } from './types/DashboardStatsType';
import { createStatCard } from '@/lib/CreateStatCard';

/**
 * 카드 제목은 메시지 키(dashboard.stats.<키>). 직원 수 값은 단위 없이 둔다(단위 '명'은 dashboard.employeeCount).
 * 응답은 캐시에 남으니 글자는 그릴 때 바꾼다(언어를 바꿔도 다시 받지 않게)
 */
export type DashboardStatTitle = keyof typeof dashboardKo.stats;
export interface DashboardStatCard extends StatCardType {
  title: DashboardStatTitle;
}

const card = (title: DashboardStatTitle, stat: Stat, unit: '₩' | ''): DashboardStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, unit, stat.trend),
  title,
});

export const mapDashboardStatsToCards = (
  data: DashboardStatRes,
): Record<string, DashboardStatCard[]> => {
  return Object.entries(data).reduce<Record<string, DashboardStatCard[]>>(
    (acc, [period, stats]) => {
      acc[period] = [
        card('totalSales', stats.total_sales, '₩'),
        card('totalPurchases', stats.total_purchases, '₩'),
        card('netProfit', stats.net_profit, '₩'),
        card('totalEmployees', stats.total_employees, ''),
      ];
      return acc;
    },
    {},
  );
};
