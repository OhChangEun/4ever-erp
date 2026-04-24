'use client';

import StatSection from '@/app/components/common/StatSection';
import TabNavigation from '@/app/components/common/TabNavigation';
import { Suspense } from 'react';
import { getInventoryStats } from '@/app/(private)/inventory/inventory.api';
import { mapInventoryStatsToCards } from './inventory.service';
import { INVENTORY_TABS } from '@/app/types/componentConstant';
import { useQuery } from '@tanstack/react-query';

export default function InventoryClient() {
  const { data: inventoryStats } = useQuery({
    queryKey: ['inventoryStats'],
    queryFn: getInventoryStats,
  });

  const inventoryStatsData = inventoryStats
    ? mapInventoryStatsToCards(inventoryStats)
    : { week: [], month: [], quarter: [], year: [] };

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        <StatSection statsData={inventoryStatsData} />
        <Suspense fallback={<div>Loading...</div>}>
          <TabNavigation tabs={INVENTORY_TABS} />
        </Suspense>
      </main>
    </div>
  );
}
