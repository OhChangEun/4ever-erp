import React from 'react';
import { StatCardType } from '@/app/types/StatType';

interface StatCardProps {
  stat: StatCardType;
  currentPeriodLabel: string;
}

/**
 * 지표 하나. 라벨 → 값 → 증감 순으로 세로 2줄.
 * 가짜 스파크라인은 제거: 실제 추이 데이터가 없는 상태에서 그래프를 그리면 안 된다.
 */
export default function StatCardItem({ stat, currentPeriodLabel }: StatCardProps) {
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
        <span className="text-xs text-gray-400">{currentPeriodLabel}</span>
      </dd>
    </div>
  );
}
