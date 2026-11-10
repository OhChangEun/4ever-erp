import type { AgingBucket, AgingBucketKey, MonthlyPoint } from './types/FinanceAnalyticsType';

/** 미수금 경과 구간 이름. 계약의 enum 순서와 같다 */
export const AGING_LABEL: Record<AgingBucketKey, string> = {
  CURRENT: '기한 전',
  D1_30: '1~30일',
  D31_60: '31~60일',
  D61_90: '61~90일',
  D90_PLUS: '90일 초과',
};

export interface MonthlySummary {
  sales: number;
  purchases: number;
  netProfit: number;
  best: { month: string; netProfit: number };
  worst: { month: string; netProfit: number };
  lossMonths: number;
}

/** 12개월 합계와 순이익이 가장 큰 달, 가장 작은 달, 적자 달 수. 같으면 앞 달 */
export const monthlySummary = (months: MonthlyPoint[]): MonthlySummary | null => {
  if (months.length === 0) return null;
  const first = months[0];
  const init: MonthlySummary = {
    sales: 0,
    purchases: 0,
    netProfit: 0,
    best: { month: first.month, netProfit: first.netProfit },
    worst: { month: first.month, netProfit: first.netProfit },
    lossMonths: 0,
  };
  return months.reduce(
    (acc, m) => ({
      sales: acc.sales + m.sales,
      purchases: acc.purchases + m.purchases,
      netProfit: acc.netProfit + m.netProfit,
      best:
        m.netProfit > acc.best.netProfit ? { month: m.month, netProfit: m.netProfit } : acc.best,
      worst:
        m.netProfit < acc.worst.netProfit ? { month: m.month, netProfit: m.netProfit } : acc.worst,
      lossMonths: acc.lossMonths + (m.netProfit < 0 ? 1 : 0),
    }),
    init,
  );
};

/** 백분율(정수). 분모가 0 이면 0 */
const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** 미수금 전체, 기한 지난 금액(기한 전 구간 밖)과 비율, 구간마다 이름과 비율 */
export const agingSummary = (buckets: AgingBucket[]) => {
  const total = buckets.reduce((sum, b) => sum + b.amount, 0);
  const overdue = buckets
    .filter((b) => b.bucket !== 'CURRENT')
    .reduce((sum, b) => sum + b.amount, 0);
  return {
    total,
    overdue,
    overdueRate: percent(overdue, total),
    rows: buckets.map((b) => ({
      ...b,
      label: AGING_LABEL[b.bucket],
      share: percent(b.amount, total),
    })),
  };
};
