'use client';

import StatSection from '@/app/components/common/StatSection';
import TabNavigation from '@/app/components/common/TabNavigation';
import { Suspense } from 'react';
import { getInventoryStats } from '@/app/(private)/inventory/inventory.api';
import { mapInventoryStatsToCards } from './inventory.service';
import { INVENTORY_TABS } from '@/app/types/componentConstant';
import { useQuery } from '@tanstack/react-query';

export default function InventoryPage() {
  const { data: inventoryStats, isLoading } = useQuery({
    queryKey: ['inventoryStats'],
    queryFn: getInventoryStats,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const inventoryStatsData = inventoryStats
    ? mapInventoryStatsToCards(inventoryStats)
    : { week: [], month: [], quarter: [], year: [] };

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        {/* 페이지 헤더 */}
        <StatSection statsData={inventoryStatsData} />
        {/* 탭 콘텐츠 */}
        <Suspense fallback={<div>Loading...</div>}>
          <TabNavigation tabs={INVENTORY_TABS} />
        </Suspense>
      </main>
    </div>
  );
}
