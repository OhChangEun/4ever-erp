import { createStatCard } from '@/lib/CreateStatCard';
import { type StatCardType } from '@/app/types/StatType';
import { type HrmStatResponse } from '../types/HrmStatsApiType';

// 변환 함수
export const mapHrmStatsToCards = (data: HrmStatResponse): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '총 직원 수',
        stats.totalEmployeeCount.value,
        stats.totalEmployeeCount.delta_rate,
        '명',
        stats.totalEmployeeCount.trend,
      ),
      createStatCard(
        '신규 입사자 수',
        stats.newEmployeeCount.value,
        stats.newEmployeeCount.delta_rate,
        '명',
        stats.newEmployeeCount.trend,
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};
