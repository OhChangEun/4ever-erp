'use client';

import { MRP_TABS } from '@/app/(private)/production/constants';
import SubNavigation from '@/app/components/common/SubNavigation';
import { useTranslations } from 'next-intl';

export default function MrpTab() {
  const t = useTranslations('production.tabs');
  const tNav = useTranslations('nav');
  // 하위 탭 처리(?subTab=, 모르는 id 는 첫 탭)는 인사와 같은 공통 SubNavigation
  return (
    <SubNavigation
      label={tNav('tabsLabel', { title: t('mrp') })}
      tabs={MRP_TABS.map((tab) => ({ ...tab, name: t(tab.name) }))}
    />
  );
}
