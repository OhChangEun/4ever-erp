import { useTranslations } from 'next-intl';
import { type Period, type StatCardType } from '@/app/types/StatType';
import StatCardItem from '@/app/components/statCard/StatCardItem';

interface StatsGridProps {
  stats: StatCardType[];
  period: Period;
}

export default function StatCardList({ stats, period }: StatsGridProps) {
  const t = useTranslations('stats');
  const currentPeriodLabel = t(`compare.${period}`);
  const safeStats = stats;

  return (
    <dl className="flex flex-wrap items-center gap-y-2 divide-x divide-gray-200 m-0">
      {safeStats.map((stat, index) => (
        <StatCardItem key={index} stat={stat} currentPeriodLabel={currentPeriodLabel} />
      ))}
    </dl>
  );
}
