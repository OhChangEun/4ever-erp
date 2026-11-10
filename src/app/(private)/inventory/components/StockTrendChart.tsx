'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslations } from 'next-intl';

/**
 * 재고 선 하나 + 안전재고 기준선(시각화 2). 색은 토큰 두 개(선: 브랜드, 기준선: 빨강), 그라데이션 없음.
 * 기준선은 범례 대신 직접 라벨. 이 파일은 StockTrend 가 동적으로만 가져온다.
 */
export default function StockTrendChart({
  points,
  safetyStock,
  describedBy,
}: {
  points: { date: string; stock: number }[];
  safetyStock: number;
  describedBy: string;
}) {
  const t = useTranslations('inventory.trend');
  return (
    <div role="img" aria-label={t('chartLabel')} aria-describedby={describedBy} className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-gray-100)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
            interval={6}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-gray-200)' }}
          />
          <YAxis
            width={40}
            tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip formatter={(v) => [Number(v).toLocaleString('ko-KR'), t('tooltipStock')]} />
          <ReferenceLine
            y={safetyStock}
            // 재고가 전부 안전재고보다 낮아도 기준선이 보이게 축을 늘린다. 기본값은 화면 밖이면 지운다(리뷰 P2)
            ifOverflow="extendDomain"
            stroke="var(--color-red-500)"
            strokeDasharray="4 3"
            label={{
              value: t('safetyLine', { value: String(safetyStock) }),
              position: 'insideTopRight',
              fontSize: 11,
              fill: 'var(--color-red-600)',
            }}
          />
          <Line
            type="monotone"
            dataKey="stock"
            stroke="var(--color-blue-500)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
