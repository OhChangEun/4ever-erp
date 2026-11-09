'use client';

import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import { fetchHrmStats } from '@/app/(private)/hrm/api/hrm.api';
import { mapHrmStatsToCards } from '@/app/(private)/hrm/services/hrm.service';
import { Suspense } from 'react';
import TabNavigation from '@/app/components/common/TabNavigation';
import { HRM_TABS } from '@/app/(private)/hrm/constants';
import { useQuery } from '@tanstack/react-query';
import { hrmStatsKeys } from '@/app/(private)/hrm/api/hrm.keys';

export default function HrmClient() {
  const { data, error } = useQuery({
    queryKey: hrmStatsKeys.all,
    queryFn: fetchHrmStats,
  });

  const hrmStatsData = data ? mapHrmStatsToCards(data) : EMPTY_STATS;

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        <Suspense fallback={<div>Loading...</div>}>
          <TabNavigation
            tabs={HRM_TABS}
            header={<StatSection statsData={hrmStatsData} error={error} />}
          />
        </Suspense>
      </main>
    </div>
  );
}
