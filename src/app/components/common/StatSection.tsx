'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { type Period, type StatCardType } from '@/app/types/StatType';
import { type KeyValueItem } from '@/app/types/CommonType';
import StatCardList from '@/app/components/statCard/StatCardList';
import { SlidingNavBar } from '@everp/ui';
import { useErrorMessage, useRequestIdLabel } from '@/i18n/useErrorMessage';

// 지표 기간 선택 항목. 글자는 메시지의 stats.period
const STAT_PERIODS: readonly Period[] = ['week', 'month', 'quarter', 'year'];

/** 통계가 아직 없을 때 쓰는 빈 띠. 0 값을 지어내지 않는다. */
export const EMPTY_STATS: Record<Period, StatCardType[]> = {
  week: [],
  month: [],
  quarter: [],
  year: [],
};

interface StatSectionProps {
  /** 기간별 카드. 매핑 함수가 응답에 온 기간만 키로 만들어서 빠진 기간이 있을 수 있다 */
  statsData: Partial<Record<Period, StatCardType[]>>;
  /** useQuery 의 error. 있으면 카드 대신 오류 한 줄을 보여준다. 0 값 카드로 실패를 숨기지 않는다. */
  error?: unknown;
}

/** 페이지 상단 지표 띠. 지표는 왼쪽에 가로로, 기간 선택은 오른쪽 끝에. */
export default function StatSection({ statsData, error }: StatSectionProps) {
  const t = useTranslations('stats');
  const errorMessageOf = useErrorMessage();
  const requestIdLabel = useRequestIdLabel(error);
  const DEFAULT_PERIOD: Period = 'week';
  // SlidingNavBar 가 items 가 바뀔 때 표시 막대를 다시 잰다. 언어가 바뀔 때만 새로 만든다
  const periodItems = useMemo<KeyValueItem<Period>[]>(
    () => STAT_PERIODS.map((key) => ({ key, value: t(`period.${key}`) })),
    [t],
  );
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(DEFAULT_PERIOD);

  const stats = statsData[selectedPeriod] ?? [];

  if (error != null) {
    return (
      <section aria-label={t('region')} className="py-3 border-b border-gray-200">
        <p role="alert" className="text-sm text-gray-700">
          {t('loadError')} <span className="text-gray-500">{errorMessageOf(error)}</span>
          {requestIdLabel && (
            <span className="ml-2 text-xs text-gray-500 tabular-nums">{requestIdLabel}</span>
          )}
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={t('region')}
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 border-b border-gray-200"
    >
      <StatCardList stats={stats} period={selectedPeriod} />
      <SlidingNavBar
        items={periodItems}
        selectedKey={selectedPeriod}
        onSelect={setSelectedPeriod}
      />
    </section>
  );
}
