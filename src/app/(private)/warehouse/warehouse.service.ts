import { type Stat, type StatCardType } from '@/app/types/StatType';
import type warehouseKo from '@/i18n/messages/warehouse/ko.json';
import { type WarehouseStatResponse } from './types/WarehouseStatsType';
import { createStatCard } from '@/lib/CreateStatCard';

/**
 * 카드 제목은 메시지 키(warehouse.stats.<키>), 값은 단위 없이 둔다(단위 '개'는 warehouse.statCount).
 * 글자는 그릴 때 바꾼다(언어를 바꿔도 다시 받지 않게)
 */
export type WarehouseStatTitle = keyof typeof warehouseKo.stats;
export interface WarehouseStatCard extends StatCardType {
  title: WarehouseStatTitle;
}

const countCard = (title: WarehouseStatTitle, stat: Stat): WarehouseStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '', stat.trend),
  title,
});

export const mapWarehouseStatsToCards = (
  data: WarehouseStatResponse,
): Record<string, WarehouseStatCard[]> => {
  return Object.entries(data).reduce<Record<string, WarehouseStatCard[]>>(
    (acc, [period, stats]) => {
      acc[period] = [
        countCard('totalWarehouses', stats.total_warehouse),
        countCard('activeWarehouses', stats.in_operation_warehouse),
      ];
      return acc;
    },
    {},
  );
};
