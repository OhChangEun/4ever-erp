'use client';

import { useState } from 'react';
import { Period, StatCardType } from '@/app/types/StatType';
import { STAT_PERIODS } from '@/app/(private)/purchase/constants';
import PageTitle from '@/app/components/common/PageTitle';
import StatCardList from '@/app/components/statCard/StatCardList';
import SlidingNavBar from './SlidingNavBar';

interface StatSectionProps {
  title: string;
  subTitle?: string;
  statsData: Record<Period, StatCardType[]>;
}

export default function StatSection({ title, subTitle, statsData }: StatSectionProps) {
  const DEFAULT_PERIOD: Period = 'week';
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [isOpen, setIsOpen] = useState(true);
  const stats = statsData?.[selectedPeriod] ?? [];
  const handlePeriodSelect = (key: string) => {
    setSelectedPeriod(key as Period);
  };

  return (
    <div>
      <div className="flex flex-col gap-3">
        {isOpen && (
          <div className="w-fit">
            <SlidingNavBar
              items={STAT_PERIODS}
              selectedKey={selectedPeriod}
              onSelect={handlePeriodSelect}
            />
          </div>
        )}
        {/* 지표 카드 리스트 */}
        {isOpen && <StatCardList stats={stats} period={selectedPeriod} />}
      </div>
    </div>
  );
}
