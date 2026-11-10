import { createStatCard } from '@/lib/CreateStatCard';
import { type InventoryStatResponse } from '@/app/(private)/inventory/types/InventoryStatsType';
import { type Stat, type StatCardType } from '@/app/types/StatType';
import type inventoryKo from '@/i18n/messages/inventory/ko.json';

/**
 * 카드 제목은 메시지 키(inventory.stats.<키>). 건수 카드 값은 단위 없이 둔다(단위 '건'은 inventory.statCount).
 * 글자는 그릴 때 바꾼다(언어를 바꿔도 다시 받지 않게)
 */
export type InventoryStatTitle = keyof typeof inventoryKo.stats;
export interface InventoryStatCard extends StatCardType {
  title: InventoryStatTitle;
  /** count 면 화면이 단위를 붙인다. won 은 '₩' 가 이미 붙어 있다 */
  unit: 'count' | 'won';
}

const countCard = (title: InventoryStatTitle, stat: Stat): InventoryStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '', stat.trend),
  title,
  unit: 'count',
});

const wonCard = (title: InventoryStatTitle, stat: Stat): InventoryStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '₩', stat.trend),
  title,
  unit: 'won',
});

export const mapInventoryStatsToCards = (
  data: InventoryStatResponse,
): Record<string, InventoryStatCard[]> => {
  return Object.entries(data).reduce<Record<string, InventoryStatCard[]>>(
    (acc, [period, stats]) => {
      acc[period] = [
        wonCard('totalStockValue', stats.total_stock),
        countCard('receivingCompleted', stats.store_complete),
        // 입고 대기(store_pending), 출고 대기(delivery_pending) 카드는 꺼 둔 상태
        countCard('shippingCompleted', stats.delivery_complete),
      ];
      return acc;
    },
    {},
  );
};
