'use client';

import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import TabNavigation from '@/app/components/common/TabNavigation';
import { Suspense } from 'react';
import { getInventoryStats } from '@/app/(private)/inventory/inventory.api';
import { mapInventoryStatsToCards } from './inventory.service';
import { INVENTORY_TABS } from '@/app/types/componentConstant';
import { useQuery } from '@tanstack/react-query';
import { inventoryStatsKeys } from '@/app/(private)/inventory/inventory.keys';

export default function InventoryClient() {
  const { data: inventoryStats, error } = useQuery({
    queryKey: inventoryStatsKeys.all,
    queryFn: getInventoryStats,
  });

  const inventoryStatsData = inventoryStats
    ? mapInventoryStatsToCards(inventoryStats)
    : EMPTY_STATS;

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        <Suspense fallback={<div>Loading...</div>}>
          <TabNavigation
            tabs={INVENTORY_TABS}
            header={<StatSection statsData={inventoryStatsData} error={error} />}
          />
        </Suspense>
      </main>
    </div>
  );
}
