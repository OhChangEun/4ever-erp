'use client';

import { Suspense } from 'react';

import {
  mapPurchaseStatsToCards,
  mapSupplierPurchaseStatsToCards,
} from '@/app/(private)/purchase/services/purchase.service';
import { PURCHASE_TABS, SUPPLIER_PURCHASE_TABS } from '@/app/(private)/purchase/constants';
import TabNavigation from '@/app/components/common/TabNavigation';
import StatSection from '@/app/components/common/StatSection';
import ErrorMessage from '@/app/components/common/ErrorMessage';
import {
  fetchPurchaseStats,
  fetchSupplierOrdersPurchaseStats,
} from '@/app/(private)/purchase/api/purchase.api';
import { StatCardType } from '@/app/types/StatType';
import { useRole } from '@/app/hooks/useRole';
import { useQuery } from '@tanstack/react-query';

export default function PurchasePage() {
  const role = useRole();
  const isSupplier = role === 'SUPPLIER_ADMIN';

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['purchaseStats', role],
    queryFn: async (): Promise<Record<string, StatCardType[]> | null> => {
      if (isSupplier) {
        const data = await fetchSupplierOrdersPurchaseStats();
        return data ? mapSupplierPurchaseStatsToCards(data) : null;
      } else {
        const data = await fetchPurchaseStats();
        return data ? mapPurchaseStatsToCards(data) : null;
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
        {statsData ? (
          <StatSection statsData={statsData} />
        ) : (
          <ErrorMessage message={'구매 통계 데이터를 불러오는데 실패했습니다.'} />
        )}

        <Suspense fallback={<div>Loading...</div>}>
          {isSupplier ? (
            //  구매 관리 탭 / 발주서 탭 / 공급업체 탭
            <TabNavigation tabs={SUPPLIER_PURCHASE_TABS} />
          ) : (
            // 발주서 탭
            <TabNavigation tabs={PURCHASE_TABS} />
          )}
        </Suspense>
      </main>
    </div>
  );
}
