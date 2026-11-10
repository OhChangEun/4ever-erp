'use client';

import { Suspense } from 'react';
import { getCustomerSalesStats, getSalesStats } from '@/app/(private)/sales/sales.api';
import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import {
  mapCustomerSalesStatsToCards,
  mapSalesStatsToCards,
  type SalesStatCard,
} from '@/app/(private)/sales/sales.service';
import SalesTabs from './components/tabs/SalesTabs';
import { useRole } from '@/app/hooks/useRole';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { salesStatsKeys } from '@/app/(private)/sales/sales.keys';

export default function SalesClient() {
  const role = useRole();
  const t = useTranslations('sales');

  const {
    data: salesStatsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: salesStatsKeys.byRole(role),
    queryFn: async (): Promise<Record<string, SalesStatCard[]>> => {
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

  // 캐시에는 제목 키와 단위 없는 건수가 있다. 글자와 단위는 여기서 붙인다(언어를 바꿔도 다시 받지 않게)
  const statsView = salesStatsData
    ? Object.fromEntries(
        Object.entries(salesStatsData).map(([period, cards]) => [
          period,
          cards.map((card) => ({
            ...card,
            title: t(`stats.${card.title}`),
            value: card.unit === 'count' ? t('statCount', { value: card.value }) : card.value,
          })),
        ]),
      )
    : EMPTY_STATS;

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
        <Suspense fallback={<div>Loading...</div>}>
          <SalesTabs header={<StatSection statsData={statsView} error={error} />} />
        </Suspense>
      </main>
    </div>
  );
}
