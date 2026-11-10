'use client';

import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import { fetchHrmStats } from '@/app/(private)/hrm/api/hrm.api';
import { mapHrmStatsToCards } from '@/app/(private)/hrm/services/hrm.service';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import TabNavigation from '@/app/components/common/TabNavigation';
import { HRM_TABS } from '@/app/(private)/hrm/constants';
import { useQuery } from '@tanstack/react-query';
import { hrmStatsKeys } from '@/app/(private)/hrm/api/hrm.keys';

export default function HrmClient() {
  const t = useTranslations('hrm');
  const { data, error } = useQuery({
    queryKey: hrmStatsKeys.all,
    queryFn: fetchHrmStats,
  });

  // 카드에는 제목 키와 단위 없는 인원 수가 있다. 글자와 단위는 여기서 붙인다
  const hrmStatsData = data
    ? Object.fromEntries(
        Object.entries(mapHrmStatsToCards(data)).map(([period, cards]) => [
          period,
          cards.map((card) => ({
            ...card,
            title: t(`stats.${card.title}`),
            value: t('statPeople', { value: card.value }),
          })),
        ]),
      )
    : EMPTY_STATS;

  // 탭 이름은 메시지 키로 들고 있다가 여기서 글자로 바꾼다(공통 TabNavigation 은 글자를 그대로 그린다)
  const tabs = HRM_TABS.map((tab) => ({ ...tab, name: t(`tabs.${tab.name}`) }));

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        <Suspense fallback={<div>Loading...</div>}>
          <TabNavigation
            tabs={tabs}
            header={<StatSection statsData={hrmStatsData} error={error} />}
          />
        </Suspense>
      </main>
    </div>
  );
}
