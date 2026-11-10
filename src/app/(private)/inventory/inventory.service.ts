import { createStatCard } from '@/lib/CreateStatCard';
import { InventoryStatResponse } from '@/app/(private)/inventory/types/InventoryStatsType';
import { StatCardType } from '@/app/types/StatType';

export const mapInventoryStatsToCards = (
  data: InventoryStatResponse,
): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '총 재고 가치',
        stats.total_stock.value,
        stats.total_stock.delta_rate,
        '₩',
        stats.total_stock.trend,
      ),
      createStatCard(
        '입고 완료',
        stats.store_complete.value,
        stats.store_complete.delta_rate,
        '건',
        stats.store_complete.trend,
      ),
      // createStatCard(
      //   '입고 대기',
      //   stats.store_pending.value,
      //   stats.store_pending.delta_rate,
      //   '건',
      // ),
      createStatCard(
        '출고 완료',
        stats.delivery_complete.value,
        stats.delivery_complete.delta_rate,
        '건',
        stats.delivery_complete.trend,
      ),
      // createStatCard(
      //   '출고 대기',
      //   stats.delivery_pending.value,
      //   stats.delivery_pending.delta_rate,
      //   '건',
      // ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};
