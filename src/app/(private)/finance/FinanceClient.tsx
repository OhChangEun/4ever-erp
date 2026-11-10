'use client';

import { Suspense } from 'react';
import {
  getCustomerStats,
  getFinanceStats,
  getSupplierStats,
} from '@/app/(private)/finance/finance.api';
import { mapCustomerSupplierStatsToCards, mapFinanceStatsToCards } from './finance.service';
import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import FinanceTabs from './components/tabs/FinanceTabs';
import { useRole } from '@/app/hooks/useRole';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { financeStatsKeys } from '@/app/(private)/finance/finance.keys';

export default function FinanceClient() {
  const role = useRole();
  const t = useTranslations('finance.stats');

  const {
    data: financeStatsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: financeStatsKeys.byRole(role),
    queryFn: async () => {
      // success 가 false 인 응답은 axios 인터셉터가 오류로 바꾼다. 여기 오는 응답은 성공뿐이다
      if (role === 'CUSTOMER_ADMIN') {
        return mapCustomerSupplierStatsToCards(await getCustomerStats());
      } else if (role === 'SUPPLIER_ADMIN') {
        return mapCustomerSupplierStatsToCards(await getSupplierStats());
      } else {
        const res = await getFinanceStats();
        return mapFinanceStatsToCards(res.data);
      }
    },
    enabled: !!role,
  });

  // 캐시에는 제목 키가 있다. 언어를 바꾸면 다시 받지 않고 여기서 글자만 바꾼다
  const statsData = financeStatsData
    ? Object.fromEntries(
        Object.entries(financeStatsData).map(([period, cards]) => [
          period,
          cards.map((card) => ({ ...card, title: t(card.title) })),
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
          <FinanceTabs header={<StatSection statsData={statsData} error={error} />} />
        </Suspense>
      </main>
    </div>
  );
}
