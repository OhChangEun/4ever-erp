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
import { financeStatsKeys } from '@/app/(private)/finance/finance.keys';

export default function FinanceClient() {
  const role = useRole();

  const {
    data: financeStatsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: financeStatsKeys.byRole(role),
    queryFn: async () => {
      // success 가 false 인 응답은 axios 인터셉터가 오류로 바꾼다. 여기 오는 응답은 성공뿐이다
      if (role === 'CUSTOMER_ADMIN') {
        const res = await getCustomerStats();
        return mapCustomerSupplierStatsToCards(res.data);
      } else if (role === 'SUPPLIER_ADMIN') {
        const res = await getSupplierStats();
        return mapCustomerSupplierStatsToCards(res.data);
      } else {
        const res = await getFinanceStats();
        return mapFinanceStatsToCards(res.data);
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
        <Suspense fallback={<div>Loading...</div>}>
          <FinanceTabs
            header={<StatSection statsData={financeStatsData ?? EMPTY_STATS} error={error} />}
          />
        </Suspense>
      </main>
    </div>
  );
}
