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

export default function StatSection({ statsData }: StatSectionProps) {
  const DEFAULT_PERIOD: Period = 'week';
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(DEFAULT_PERIOD);

  const stats = statsData?.[selectedPeriod] ?? [];
  const handlePeriodSelect = (key: string) => {
    setSelectedPeriod(key as Period);
  };

  return (
    <div>
      <div className="flex flex-col gap-3">
        <div className="w-fit">
          <SlidingNavBar
            items={STAT_PERIODS}
            selectedKey={selectedPeriod}
            onSelect={handlePeriodSelect}
          />
        </div>
        {/* 지표 카드 리스트 */}
        <StatCardList stats={stats} period={selectedPeriod} />
      </div>
    </div>
  );
}
