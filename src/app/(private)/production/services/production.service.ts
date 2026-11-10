import { createStatCard } from '@/lib/CreateStatCard';
import { type Stat, type StatCardType } from '@/app/types/StatType';
import { type ProductionStatResponse } from '@/app/(private)/production/types/ProductionStatsType';
import type productionKo from '@/i18n/messages/production/ko.json';

/**
 * 카드 제목은 메시지 키(production.stats.<키>). 값은 단위 없이 둔다(단위 '건'은 production.statCount).
 * 글자는 그릴 때 바꾼다(언어를 바꿔도 다시 받지 않게)
 */
export type ProductionStatTitle = keyof typeof productionKo.stats;
export interface ProductionStatCard extends StatCardType {
  title: ProductionStatTitle;
}

const countCard = (title: ProductionStatTitle, stat: Stat): ProductionStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '', stat.trend),
  title,
});

// 변환 함수
export const mapProductionStatsToCards = (
  data: ProductionStatResponse,
): Record<string, ProductionStatCard[]> => {
  return Object.entries(data).reduce<Record<string, ProductionStatCard[]>>(
    (acc, [period, stats]) => {
      acc[period] = [
        countCard('inProduction', stats.production_in),
        countCard('completed', stats.production_completed),
        countCard('bomCount', stats.bom_count),
      ];
      return acc;
    },
    {},
  );
};
