'use client';

import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import TabNavigation from '@/app/components/common/TabNavigation';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { getInventoryStats } from '@/app/(private)/inventory/inventory.api';
import { mapInventoryStatsToCards } from './inventory.service';
import { INVENTORY_TABS } from '@/app/(private)/inventory/inventory.tabs';
import { useQuery } from '@tanstack/react-query';
import { inventoryStatsKeys } from '@/app/(private)/inventory/inventory.keys';

export default function InventoryClient() {
  const t = useTranslations('inventory');
  const { data: inventoryStats, error } = useQuery({
    queryKey: inventoryStatsKeys.all,
    queryFn: getInventoryStats,
  });

  // 카드에는 제목 키와 단위 없는 건수가 있다. 글자와 단위는 여기서 붙인다
  const inventoryStatsData = inventoryStats
    ? Object.fromEntries(
        Object.entries(mapInventoryStatsToCards(inventoryStats)).map(([period, cards]) => [
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
  const tabs = INVENTORY_TABS.map((tab) => ({ ...tab, name: t(`tabs.${tab.name}`) }));

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        <Suspense fallback={<div>Loading...</div>}>
          <TabNavigation
            tabs={tabs}
            header={<StatSection statsData={inventoryStatsData} error={error} />}
          />
        </Suspense>
      </main>
    </div>
  );
}
