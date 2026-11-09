'use client';

import { Suspense } from 'react';
import {
  mapPurchaseStatsToCards,
  mapSupplierPurchaseStatsToCards,
} from '@/app/(private)/purchase/services/purchase.service';
import { PURCHASE_TABS, SUPPLIER_PURCHASE_TABS } from '@/app/(private)/purchase/purchase.tabs';
import TabNavigation from '@/app/components/common/TabNavigation';
import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import {
  fetchPurchaseStats,
  fetchSupplierOrdersPurchaseStats,
} from '@/app/(private)/purchase/api/purchase.api';
import { StatCardType } from '@/app/types/StatType';
import { useRole } from '@/app/hooks/useRole';
import { useQuery } from '@tanstack/react-query';
import { purchaseStatsKeys } from '@/app/(private)/purchase/api/purchase.keys';

export default function PurchaseClient() {
  const role = useRole();
  const isSupplier = role === 'SUPPLIER_ADMIN';

  const {
    data: statsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: purchaseStatsKeys.byRole(role),
    queryFn: async (): Promise<Record<string, StatCardType[]>> => {
      if (isSupplier) {
        const data = await fetchSupplierOrdersPurchaseStats();
        return mapSupplierPurchaseStatsToCards(data);
      } else {
        const data = await fetchPurchaseStats();
        return mapPurchaseStatsToCards(data);
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
          <TabNavigation
            tabs={isSupplier ? SUPPLIER_PURCHASE_TABS : PURCHASE_TABS}
            header={<StatSection statsData={statsData ?? EMPTY_STATS} error={error} />}
          />
        </Suspense>
      </main>
    </div>
  );
}
