import { createStatCard } from '@/lib/CreateStatCard';
import { type Stat, type StatCardType } from '@/app/types/StatType';
import { type HrmStatResponse } from '../types/HrmStatsApiType';
import type hrmKo from '@/i18n/messages/hrm/ko.json';

/**
 * 카드 제목은 메시지 키(hrm.stats.<키>). 값은 단위 없이 둔다(단위 '명'은 hrm.statPeople).
 * 글자는 그릴 때 바꾼다(언어를 바꿔도 다시 받지 않게)
 */
export type HrmStatTitle = keyof typeof hrmKo.stats;
export interface HrmStatCard extends StatCardType {
  title: HrmStatTitle;
}

const peopleCard = (title: HrmStatTitle, stat: Stat): HrmStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '', stat.trend),
  title,
});

// 변환 함수
export const mapHrmStatsToCards = (data: HrmStatResponse): Record<string, HrmStatCard[]> => {
  return Object.entries(data).reduce<Record<string, HrmStatCard[]>>((acc, [period, stats]) => {
    acc[period] = [
      peopleCard('totalEmployees', stats.totalEmployeeCount),
      peopleCard('newEmployees', stats.newEmployeeCount),
    ];
    return acc;
  }, {});
};
