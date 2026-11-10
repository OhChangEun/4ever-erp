import { createStatCard } from '@/lib/CreateStatCard';
import { type StatCardType } from '@/app/types/StatType';
import { type ProductionStatResponse } from '@/app/(private)/production/types/ProductionStatsType';

// 변환 함수
export const mapProductionStatsToCards = (
  data: ProductionStatResponse,
): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '생산중인 품목',
        stats.production_in.value,
        stats.production_in.delta_rate,
        '건',
        stats.production_in.trend,
      ),
      createStatCard(
        '생산 완료된 품목',
        stats.production_completed.value,
        stats.production_completed.delta_rate,
        '건',
        stats.production_completed.trend,
      ),
      createStatCard(
        'Bom 개수',
        stats.bom_count.value,
        stats.bom_count.delta_rate,
        '건',
        stats.bom_count.trend,
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};
