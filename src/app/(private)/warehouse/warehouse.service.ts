import { StatCardType } from '@/app/types/StatType';
import { WarehouseStatResponse } from './types/WarehouseStatsType';
import { createStatCard } from '@/lib/CreateStatCard';

export const mapWarehouseStatsToCards = (
  data: WarehouseStatResponse,
): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '총 창고 수',
        stats.total_warehouse.value,
        stats.total_warehouse.delta_rate,
        '개',
      ),
      createStatCard(
        '운영 중인 창고',
        stats.in_operation_warehouse.value,
        stats.in_operation_warehouse.delta_rate,
        '개',
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};
