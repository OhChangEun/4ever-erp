import { type StatCardType } from '@/app/types/StatType';

// 지표 공통 처리 함수
export const createStatCard = (
  title: string,
  value: number,
  delta: number,
  unit: string = '',
  /** 기간 안의 추이(시각화 1). 계약의 Stat.trend */
  trend?: readonly number[],
): StatCardType => {
  const formattedValue =
    unit === '₩' ? `${unit}${value.toLocaleString()}` : `${value.toLocaleString()}${unit}`;
  const change = `${delta > 0 ? '+' : ''}${delta}%`;
  const changeType = delta >= 0 ? 'increase' : 'decrease';

  return {
    title,
    value: formattedValue,
    change,
    changeType,
    ...(trend && { trend }),
  };
};
