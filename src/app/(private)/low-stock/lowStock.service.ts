import { type Stat, type StatCardType } from '@/app/types/StatType';
import { type LowStockStatResponse } from './types/LowStockStatsType';
import { createStatCard } from '@/lib/CreateStatCard';
import type lowStockKo from '@/i18n/messages/lowStock/ko.json';

/**
 * 카드 제목은 메시지 키(lowStock.stats.<키>), 값은 단위 없는 건수(단위 '건'은 lowStock.statCount).
 * 글자는 그릴 때 바꾼다(언어를 바꿔도 다시 받지 않게)
 */
export type LowStockStatTitle = keyof typeof lowStockKo.stats;
export interface LowStockStatCard extends StatCardType {
  title: LowStockStatTitle;
}

const countCard = (title: LowStockStatTitle, stat: Stat): LowStockStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '', stat.trend),
  title,
});

export const mapLowStockStatsToCards = (
  data: LowStockStatResponse,
): Record<string, LowStockStatCard[]> => {
  return Object.entries(data).reduce<Record<string, LowStockStatCard[]>>((acc, [period, stats]) => {
    acc[period] = [
      countCard('urgentShortage', stats.total_emergency),
      countCard('cautionShortage', stats.total_warning),
    ];
    return acc;
  }, {});
};
