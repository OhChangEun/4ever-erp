'use client';

import Link from 'next/link';
import WarehouseList from './components/WarehouseList';
import { Suspense } from 'react';
import StatSection from '@/app/components/common/StatSection';
import { getWarehouseStats } from './warehouse.api';
import { mapWarehouseStatsToCards } from './warehouse.service';
import { useQuery } from '@tanstack/react-query';

export default function WarehousePage() {
  const { data: warehouseStats, isLoading } = useQuery({
    queryKey: ['warehouseStats'],
    queryFn: getWarehouseStats,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const warehouseStatsData = warehouseStats
    ? mapWarehouseStatsToCards(warehouseStats)
    : { week: [], month: [], quarter: [], year: [] };

  return (
    <div className="bg-gray-50">
      <main className="w-full px-6 py-6">
        {/* 페이지 헤더 */}
        <StatSection statsData={warehouseStatsData} />
        <div className="w-full flex justify-end">
          <Link
            href="/inventory"
            className="px-4 py-2  text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <i className="ri-arrow-go-back-line mr-2" />
            재고관리로 돌아가기
          </Link>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <WarehouseList />
        </Suspense>
      </main>
    </div>
  );
}
