'use client';

import StatSection from '@/app/components/common/StatSection';
import { fetchHrmStats } from '@/app/(private)/hrm/api/hrm.api';
import { mapHrmStatsToCards } from '@/app/(private)/hrm/services/hrm.service';
import ErrorMessage from '@/app/components/common/ErrorMessage';
import { Suspense } from 'react';
import TabNavigation from '@/app/components/common/TabNavigation';
import { HRM_TABS } from '@/app/(private)/hrm/constants';
import { useQuery } from '@tanstack/react-query';

export default function HrmPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['hrmStats'],
    queryFn: fetchHrmStats,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const hrmStatsData = data ? mapHrmStatsToCards(data ?? {}) : null;

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        {hrmStatsData ? (
          <StatSection statsData={hrmStatsData} />
        ) : (
          <ErrorMessage message={'인적자원관리 통계 데이터를 불러오는데 실패했습니다.'} />
        )}

        {/* 직원관리 탭 / 급여관리 탭 / 근태관리 탭 / 교육관리 탭 */}
        <Suspense fallback={<div>Loading...</div>}>
          <TabNavigation tabs={HRM_TABS} />
        </Suspense>
      </main>
    </div>
  );
}
