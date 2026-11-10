'use client';

import { Suspense } from 'react';
import {
  mapPurchaseStatsToCards,
  mapSupplierPurchaseStatsToCards,
  type PurchaseStatCard,
} from '@/app/(private)/purchase/services/purchase.service';
import { PURCHASE_TABS, SUPPLIER_PURCHASE_TABS } from '@/app/(private)/purchase/purchase.tabs';
import TabNavigation from '@/app/components/common/TabNavigation';
import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import {
  fetchPurchaseStats,
  fetchSupplierOrdersPurchaseStats,
} from '@/app/(private)/purchase/api/purchase.api';
import { useRole } from '@/app/hooks/useRole';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { purchaseStatsKeys } from '@/app/(private)/purchase/api/purchase.keys';

export default function PurchaseClient() {
  const role = useRole();
  const isSupplier = role === 'SUPPLIER_ADMIN';
  const t = useTranslations('purchase');

  const {
    data: statsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: purchaseStatsKeys.byRole(role),
    queryFn: async (): Promise<Record<string, PurchaseStatCard[]>> => {
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

  // 캐시에는 제목 키와 단위 없는 건수가 있다. 글자와 단위는 여기서 붙인다(언어를 바꿔도 다시 받지 않게)
  const statsView = statsData
    ? Object.fromEntries(
        Object.entries(statsData).map(([period, cards]) => [
          period,
          cards.map((card) => ({
            ...card,
            title: t(`stats.${card.title}`),
            value: card.unit === 'count' ? t('statCount', { value: card.value }) : card.value,
          })),
        ]),
      )
    : EMPTY_STATS;

  // 탭 이름은 메시지 키로 들고 있다가 여기서 글자로 바꾼다(공통 TabNavigation 은 글자를 그대로 그린다)
  const tabs = (isSupplier ? SUPPLIER_PURCHASE_TABS : PURCHASE_TABS).map((tab) => ({
    ...tab,
    name: t(`tabs.${tab.name}`),
  }));

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
          <TabNavigation tabs={tabs} header={<StatSection statsData={statsView} error={error} />} />
        </Suspense>
      </main>
    </div>
  );
}
