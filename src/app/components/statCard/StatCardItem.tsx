import { useTranslations } from 'next-intl';
import { Sparkline } from '@everp/ui';
import { type StatCardType } from '@/app/types/StatType';

interface StatCardProps {
  stat: StatCardType;
  currentPeriodLabel: string;
}

/**
 * 지표 하나. 라벨 → 값 → 증감 순으로 세로 2줄.
 * 추이(trend)가 있을 때만 스파크라인을 그린다(시각화 1). 추이 데이터 없이 그래프를 그리지 않는다.
 */
export default function StatCardItem({ stat, currentPeriodLabel }: StatCardProps) {
  const t = useTranslations('stats');
  const isUp = stat.changeType === 'increase';

  return (
    <div className="flex flex-col gap-0.5 pr-6 pl-6 first:pl-0 min-w-0">
      <dt className="text-xs text-gray-500 whitespace-nowrap">{stat.title}</dt>
      <dd className="m-0 flex items-baseline gap-2 whitespace-nowrap">
        <span className="text-lg font-semibold text-gray-900 tabular-nums leading-tight">
          {stat.value}
        </span>
        <span className={`text-xs tabular-nums ${isUp ? 'text-green-600' : 'text-red-500'}`}>
          {isUp ? '▲' : '▼'} {stat.change}
        </span>
        <span className="text-xs text-gray-500">{currentPeriodLabel}</span>
        {stat.trend && <Sparkline data={stat.trend} label={t('trend', { title: stat.title })} />}
      </dd>
    </div>
  );
}
