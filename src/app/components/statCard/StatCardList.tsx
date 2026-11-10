import { type Period, type StatCardType } from '@/app/types/StatType';
import StatCardItem from '@/app/components/statCard/StatCardItem';

interface StatsGridProps {
  stats: StatCardType[];
  period: Period;
}

export default function StatCardList({ stats, period }: StatsGridProps) {
  const comparisonLabelMap: Record<Period, string> = {
    week: '전주 대비',
    month: '전월 대비',
    quarter: '전분기 대비',
    year: '전년 대비',
  };

  const currentPeriodLabel = comparisonLabelMap[period];
  const safeStats = stats ?? [];

  return (
    <dl className="flex flex-wrap items-center gap-y-2 divide-x divide-gray-200 m-0">
      {safeStats.map((stat, index) => (
        <StatCardItem key={index} stat={stat} currentPeriodLabel={currentPeriodLabel} />
      ))}
    </dl>
  );
}
