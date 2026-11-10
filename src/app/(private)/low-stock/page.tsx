'use client';

import LowStockList from './components/LowStockList';
import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import { Suspense } from 'react';
import { getLowStockStats } from './lowStock.api';
import { mapLowStockStatsToCards } from './lowStock.service';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { lowStockStatsKeys } from '@/app/(private)/low-stock/lowStock.keys';

export default function LowStockPage() {
  const t = useTranslations('lowStock');
  const {
    data: lowStockStats,
    isLoading,
    error,
  } = useQuery({
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

  // 카드에는 제목 키와 단위 없는 건수가 있다. 글자와 단위 '건'은 여기서 붙인다
  const lowStockStatsData = lowStockStats
    ? Object.fromEntries(
        Object.entries(mapLowStockStatsToCards(lowStockStats)).map(([period, cards]) => [
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
        <StatSection statsData={lowStockStatsData} error={error} />

        <Suspense fallback={<div>Loading...</div>}>
          <LowStockList />
        </Suspense>
      </main>
    </div>
  );
}
