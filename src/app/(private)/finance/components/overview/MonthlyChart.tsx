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
import { useTranslations } from 'next-intl';
import { compactWon, formatCurrency } from '@/app/utils/number';
import type financeKo from '@/i18n/messages/finance/ko.json';
import type { MonthlyPoint } from '../../types/FinanceAnalyticsType';

/** 차트 계열 이름의 메시지 키(finance.overview.series.<키>). dataKey 와 같다 */
type Series = keyof typeof financeKo.overview.series;
const isSeries = (name: string): name is Series =>
  name === 'sales' || name === 'purchases' || name === 'netProfit';

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
  const t = useTranslations('finance.overview');
  return (
    <div role="img" aria-label={t('monthly.chart')} aria-describedby={describedBy} className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={months} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gray-100)" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => t('monthly.monthTick', { month: Number(m.slice(5)) })}
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
            formatter={(v, name) => {
              const key = String(name);
              return [formatCurrency(Number(v)), isSeries(key) ? t(`series.${key}`) : key];
            }}
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
