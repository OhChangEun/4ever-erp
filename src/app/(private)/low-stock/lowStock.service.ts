import { type StatCardType } from '@/app/types/StatType';
import { type LowStockStatResponse } from './types/LowStockStatsType';
import { createStatCard } from '@/lib/CreateStatCard';

export const mapLowStockStatsToCards = (
  data: LowStockStatResponse,
): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '긴급 재고 부족',
        stats.total_emergency.value,
        stats.total_emergency.delta_rate,
        '건',
        stats.total_emergency.trend,
      ),
      createStatCard(
        '주의 재고 부족',
        stats.total_warning.value,
        stats.total_warning.delta_rate,
        '건',
        stats.total_warning.trend,
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};
