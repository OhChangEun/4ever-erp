'use client';

import Link from 'next/link';
import WarehouseList from './components/WarehouseList';
import { Suspense } from 'react';
import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import { getWarehouseStats } from './warehouse.api';
import { mapWarehouseStatsToCards } from './warehouse.service';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { warehouseStatsKeys } from '@/app/(private)/warehouse/warehouse.keys';

export default function WarehousePage() {
  const t = useTranslations('warehouse');
  const {
    data: warehouseStats,
    isLoading,
    error,
  } = useQuery({
    queryKey: warehouseStatsKeys.all,
    queryFn: getWarehouseStats,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // 카드에는 제목 키와 단위 없는 값이 있다. 글자와 단위는 여기서 붙인다
  const warehouseStatsData = warehouseStats
    ? Object.fromEntries(
        Object.entries(mapWarehouseStatsToCards(warehouseStats)).map(([period, cards]) => [
          period,
          cards.map((card) => ({
            ...card,
            title: t(`stats.${card.title}`),
            value: t('statCount', { value: card.value }),
          })),
        ]),
      )
    : EMPTY_STATS;

  return (
    <div className="bg-gray-50">
      <main className="w-full px-6 py-6">
        {/* 페이지 헤더 */}
        <StatSection statsData={warehouseStatsData} error={error} />
        <div className="w-full flex justify-end">
          <Link
            href="/inventory"
            className="px-4 py-2  text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <i className="ri-arrow-go-back-line mr-2" />
            {t('page.backToInventory')}
          </Link>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <WarehouseList />
        </Suspense>
      </main>
    </div>
  );
}
