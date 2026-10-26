'use client';

import { useState } from 'react';
import { Period, StatCardType } from '@/app/types/StatType';
import { KeyValueItem } from '@/app/types/CommonType';
import StatCardList from '@/app/components/statCard/StatCardList';
import SlidingNavBar from './SlidingNavBar';

// 지표 기간 선택 항목
const STAT_PERIODS: KeyValueItem<Period>[] = [
  { key: 'week', value: '이번 주' },
  { key: 'month', value: '이번 달' },
  { key: 'quarter', value: '이번 분기' },
  { key: 'year', value: '연도별' },
];

interface StatSectionProps {
  statsData: Record<Period, StatCardType[]>;
}

/** 페이지 상단 지표 띠. 지표는 왼쪽에 가로로, 기간 선택은 오른쪽 끝에. */
export default function StatSection({ statsData }: StatSectionProps) {
  const DEFAULT_PERIOD: Period = 'week';
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(DEFAULT_PERIOD);

  const stats = statsData?.[selectedPeriod] ?? [];
  const handlePeriodSelect = (key: string) => {
    setSelectedPeriod(key as Period);
  };

  return (
    <section
      aria-label="지표"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 border-b border-gray-200"
    >
      <StatCardList stats={stats} period={selectedPeriod} />
      <SlidingNavBar
        items={STAT_PERIODS}
        selectedKey={selectedPeriod}
        onSelect={handlePeriodSelect}
      />
    </section>
  );
}
