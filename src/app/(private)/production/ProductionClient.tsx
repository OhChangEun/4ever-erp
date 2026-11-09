'use client';

import { Suspense } from 'react';
import TabNavigation from '@/app/components/common/TabNavigation';
import { PRODUCTION_TABS } from '@/app/(private)/production/constants';
import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import { AppError } from '@/lib/AppError';
import { fetchProductionStats } from '@/app/(private)/production/api/production.api';
import { mapProductionStatsToCards } from '@/app/(private)/production/services/production.service';
import { useQuery } from '@tanstack/react-query';
import { productionStatsKeys } from '@/app/(private)/production/api/production.keys';

export default function ProductionClient() {
  const { data, error } = useQuery({
    queryKey: productionStatsKeys.all,
    queryFn: fetchProductionStats,
  });

  // fetchProductionStats 는 아직 실패를 null 로 돌려준다(production.api.ts:37, 린트 1차 브랜치가 수정 중).
  // null 을 실패로 바꿔 넘겨야 빈 띠로 숨겨지지 않는다. 그 파일을 고치면 이 줄은 지운다. 리뷰 C1.
  const statsError =
    error ?? (data === null ? new AppError('server', '생산 통계 응답이 비어 있습니다.') : null);
  const productionStatsData = data ? mapProductionStatsToCards(data) : EMPTY_STATS;

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        <Suspense fallback={<div>Loading..</div>}>
          <TabNavigation
            tabs={PRODUCTION_TABS}
            header={<StatSection statsData={productionStatsData} error={statsError} />}
          />
        </Suspense>
      </main>
    </div>
  );
}
