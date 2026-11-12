import { type StatCardType } from '@/app/types/StatType';
import { formatNumber } from '@/app/utils/number';

// 지표 공통 처리 함수
export const createStatCard = (
  title: string,
  value: number,
  delta: number,
  unit: string = '',
  /** 기간 안의 추이(시각화 1). 계약의 Stat.trend */
  trend?: readonly number[],
): StatCardType => {
  const num = formatNumber(value);
  // 값이 없으면 단위 없이 '-'(formatCurrency 와 같다)
  const formattedValue = num === '-' ? num : unit === '₩' ? `${unit}${num}` : `${num}${unit}`;
  // delta 는 계약대로 직전 기간 대비 비율(0.12 = 12%). 100 을 곱해 소수 첫째 자리까지 보인다.
  // verified=false: 실서버 형태는 팀 확인 전(게이트웨이 DashboardValueDto.java:23-29 는 절대 차이라고 적는다)
  // 반올림해 0 이 된 작은 감소는 0%(▲)로 보인다. `+ 0` 은 -0 을 0 으로 바꾼다
  const percent = Math.round(delta * 1000) / 10 + 0;
  const change = `${percent > 0 ? '+' : ''}${percent}%`;
  const changeType = percent >= 0 ? 'increase' : 'decrease';

  return {
    title,
    value: formattedValue,
    change,
    changeType,
    ...(trend && { trend }),
  };
};
