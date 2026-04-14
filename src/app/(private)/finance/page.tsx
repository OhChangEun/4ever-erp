'use client';

import { Suspense } from 'react';
import {
  getCustomerStats,
  getFinanceStats,
  getSupplierStats,
} from '@/app/(private)/finance/finance.api';
import ErrorMessage from '@/app/components/common/ErrorMessage';
import { mapCustomerSupplierStatsToCards, mapFinanceStatsToCards } from './finance.service';
import StatSection from '@/app/components/common/StatSection';
import FinanceTabs from './components/tabs/FinanceTabs';
import { useRole } from '@/app/hooks/useRole';
import { useQuery } from '@tanstack/react-query';

export default function FinancePage() {
  const role = useRole();

  const { data: financeStatsData, isLoading } = useQuery({
    queryKey: ['financeStats', role],
    queryFn: async () => {
      if (role === 'CUSTOMER_ADMIN') {
        const res = await getCustomerStats();
        return res.success ? mapCustomerSupplierStatsToCards(res.data) : null;
      } else if (role === 'SUPPLIER_ADMIN') {
        const res = await getSupplierStats();
        return res.success ? mapCustomerSupplierStatsToCards(res.data) : null;
      } else {
        const res = await getFinanceStats();
        return res.success ? mapFinanceStatsToCards(res.data) : null;
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
        {financeStatsData ? (
          <StatSection statsData={financeStatsData} />
        ) : (
          <ErrorMessage message={'재무 통계 데이터를 불러오는데 실패했습니다.'} />
        )}

        {/* 탭 네비게이션 */}
        <Suspense fallback={<div>Loading...</div>}>
          <FinanceTabs />
        </Suspense>
      </main>
    </div>
  );
}
