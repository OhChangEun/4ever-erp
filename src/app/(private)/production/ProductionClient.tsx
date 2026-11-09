'use client';

import { Suspense } from 'react';
import TabNavigation from '@/app/components/common/TabNavigation';
import { PRODUCTION_TABS } from '@/app/(private)/production/constants';
import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import { fetchProductionStats } from '@/app/(private)/production/api/production.api';
import { mapProductionStatsToCards } from '@/app/(private)/production/services/production.service';
import { useQuery } from '@tanstack/react-query';
import { productionStatsKeys } from '@/app/(private)/production/api/production.keys';

export default function ProductionClient() {
  const { data, error } = useQuery({
    queryKey: productionStatsKeys.all,
    queryFn: fetchProductionStats,
  });

  const productionStatsData = data ? mapProductionStatsToCards(data) : EMPTY_STATS;

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        <Suspense fallback={<div>Loading..</div>}>
          <TabNavigation
            tabs={PRODUCTION_TABS}
            header={<StatSection statsData={productionStatsData} error={error} />}
          />
        </Suspense>
      </main>
    </div>
  );
}
