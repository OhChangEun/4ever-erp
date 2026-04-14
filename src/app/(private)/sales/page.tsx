'use client';

import { Suspense } from 'react';
import { getCustomerSalesStats, getSalesStats } from '@/app/(private)/sales/sales.api';
import StatSection from '@/app/components/common/StatSection';
import {
  mapCustomerSalesStatsToCards,
  mapSalesStatsToCards,
} from '@/app/(private)/sales/sales.service';
import SalesTabs from './components/tabs/SalesTabs';
import { useRole } from '@/app/hooks/useRole';
import { useQuery } from '@tanstack/react-query';

export default function SalesPage() {
  const role = useRole();

  const { data: salesStatsData, isLoading } = useQuery({
    queryKey: ['salesStats', role],
    queryFn: async () => {
      if (role === 'CUSTOMER_ADMIN') {
        const res = await getCustomerSalesStats();
        return mapCustomerSalesStatsToCards(res);
      } else {
        const res = await getSalesStats();
        return mapSalesStatsToCards(res);
      }
    },
    enabled: !!role,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        {/* 페이지 헤더 */}
        <StatSection statsData={salesStatsData ?? { week: [], month: [], quarter: [], year: [] }} />
        {/* 탭 콘텐츠 */}
        <Suspense fallback={<div>Loading...</div>}>
          <SalesTabs />
        </Suspense>
      </main>
    </div>
  );
}
