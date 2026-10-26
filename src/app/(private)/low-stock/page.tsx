'use client';

import LowStockList from './components/LowStockList';
import StatSection from '@/app/components/common/StatSection';
import { Suspense } from 'react';
import { getLowStockStats } from './lowStock.api';
import { mapLowStockStatsToCards } from './lowStock.service';
import { useQuery } from '@tanstack/react-query';
import { lowStockStatsKeys } from '@/app/(private)/low-stock/lowStock.keys';

export default function LowStockPage() {
  const { data: lowStockStats, isLoading } = useQuery({
    queryKey: lowStockStatsKeys.all,
    queryFn: getLowStockStats,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const lowStockStatsData = lowStockStats
    ? mapLowStockStatsToCards(lowStockStats)
    : { week: [], month: [], quarter: [], year: [] };

  return (
    <div className="bg-gray-50">
      <main className="w-full px-6 py-6">
        <StatSection statsData={lowStockStatsData} />

        <Suspense fallback={<div>Loading...</div>}>
          <LowStockList />
        </Suspense>
      </main>
    </div>
  );
}
