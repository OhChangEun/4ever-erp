'use client';

import { useState } from 'react';
import { Period, StatCardType } from '@/app/types/StatType';
import { KeyValueItem } from '@/app/types/CommonType';
import StatCardList from '@/app/components/statCard/StatCardList';
import SlidingNavBar from './SlidingNavBar';
import { errorMessageOf } from '@/lib/AppError';

// 지표 기간 선택 항목
const STAT_PERIODS: KeyValueItem<Period>[] = [
  { key: 'week', value: '이번 주' },
  { key: 'month', value: '이번 달' },
  { key: 'quarter', value: '이번 분기' },
  { key: 'year', value: '연도별' },
];

/** 통계가 아직 없을 때 쓰는 빈 띠. 0 값을 지어내지 않는다. */
export const EMPTY_STATS: Record<Period, StatCardType[]> = {
  week: [],
  month: [],
  quarter: [],
  year: [],
};

interface StatSectionProps {
  statsData: Record<Period, StatCardType[]>;
  /** useQuery 의 error. 있으면 카드 대신 오류 한 줄을 보여준다. 0 값 카드로 실패를 숨기지 않는다. */
  error?: unknown;
}

/** 페이지 상단 지표 띠. 지표는 왼쪽에 가로로, 기간 선택은 오른쪽 끝에. */
export default function StatSection({ statsData, error }: StatSectionProps) {
  const DEFAULT_PERIOD: Period = 'week';
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(DEFAULT_PERIOD);

  const stats = statsData?.[selectedPeriod] ?? [];

  if (error != null) {
    return (
      <section aria-label="지표" className="py-3 border-b border-gray-200">
        <p role="alert" className="text-sm text-gray-700">
          지표를 불러오지 못했습니다. <span className="text-gray-500">{errorMessageOf(error)}</span>
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="지표"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 border-b border-gray-200"
    >
      <StatCardList stats={stats} period={selectedPeriod} />
      <SlidingNavBar
        items={STAT_PERIODS}
        selectedKey={selectedPeriod}
        onSelect={setSelectedPeriod}
      />
    </section>
  );
}
