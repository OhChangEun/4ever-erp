'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import TabNavigation from '@/app/components/common/TabNavigation';
import { useRole } from '@/app/hooks/useRole';
import { getSalesTabsByRole } from '../../utils';

export default function SalesTabs({ header }: { header?: ReactNode }) {
  const role = useRole();
  const t = useTranslations('sales');
  // 탭 이름은 메시지 키로 들고 있다가 여기서 글자로 바꾼다(공통 TabNavigation 은 글자를 그대로 그린다)
  const allowedTabs = getSalesTabsByRole(role).map((tab) => ({
    ...tab,
    name: t(`tabs.${tab.name}`),
  }));

  return <TabNavigation tabs={allowedTabs} header={header} />;
}
