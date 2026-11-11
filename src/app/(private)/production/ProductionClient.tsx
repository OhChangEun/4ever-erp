'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import TabNavigation from '@/app/components/common/TabNavigation';
import { PRODUCTION_TABS } from '@/app/(private)/production/constants';
import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import { fetchProductionStats } from '@/app/(private)/production/api/production.api';
import { mapProductionStatsToCards } from '@/app/(private)/production/services/production.service';
import { useQuery } from '@tanstack/react-query';
import { productionStatsKeys } from '@/app/(private)/production/api/production.keys';
import { BomStatusActionsContext } from '@/app/(private)/production/components/bom/BomStatusActionsContext';

export default function ProductionClient({ realBackend }: { realBackend: boolean }) {
  const t = useTranslations('production');
  const { data, error } = useQuery({
    queryKey: productionStatsKeys.all,
    queryFn: fetchProductionStats,
  });

  // 카드에는 제목 키와 단위 없는 건수가 있다. 글자와 단위는 여기서 붙인다
  const productionStatsData = data
    ? Object.fromEntries(
        Object.entries(mapProductionStatsToCards(data)).map(([period, cards]) => [
          period,
          cards.map((card) => ({
            ...card,
            title: t(`stats.${card.title}`),
            value: t('statCount', { value: card.value }),
          })),
        ]),
      )
    : EMPTY_STATS;

  // 탭 이름은 메시지 키로 들고 있다가 여기서 글자로 바꾼다(공통 TabNavigation 은 글자를 그대로 그린다)
  const tabs = PRODUCTION_TABS.map((tab) => ({ ...tab, name: t(`tabs.${tab.name}`) }));

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        <Suspense fallback={<div>Loading..</div>}>
          <BomStatusActionsContext value={!realBackend}>
            <TabNavigation
              tabs={tabs}
              header={<StatSection statsData={productionStatsData} error={error} />}
            />
          </BomStatusActionsContext>
        </Suspense>
      </main>
    </div>
  );
}
