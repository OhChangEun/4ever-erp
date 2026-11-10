'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '@/app/utils/number';
import { compactWon } from '../../financeAnalytics';
import type { MonthlyPoint } from '../../types/FinanceAnalyticsType';

const NAME: Partial<Record<string, string>> = {
  sales: '매출',
  purchases: '매입',
  netProfit: '순이익',
};

/**
 * 월별 매출, 매입 막대 + 순이익 선(시각화 4). 색은 토큰 세 개, 그라데이션 없음.
 * 0 기준선은 적자 달의 선이 아래로 내려가는 것을 보이게 한다. 이 파일은 FinanceOverview 가 동적으로만 가져온다.
 */
export default function MonthlyChart({
  months,
  describedBy,
}: {
  months: MonthlyPoint[];
  describedBy: string;
}) {
  return (
    <div
      role="img"
      aria-label="월별 매출과 매입 차트"
      aria-describedby={describedBy}
      className="h-64"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={months} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gray-100)" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => `${Number(m.slice(5))}월`}
            tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-gray-200)' }}
          />
          <YAxis
            width={52}
            tickFormatter={compactWon}
            tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v, name) => [formatCurrency(Number(v)), NAME[String(name)] ?? String(name)]}
          />
          <ReferenceLine y={0} stroke="var(--color-gray-300)" />
          <Bar dataKey="sales" fill="var(--color-blue-500)" isAnimationActive={false} />
          <Bar dataKey="purchases" fill="var(--color-gray-300)" isAnimationActive={false} />
          <Line
            type="linear"
            dataKey="netProfit"
            stroke="var(--color-gray-900)"
            strokeWidth={2}
            dot={{ r: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
