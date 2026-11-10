'use client';

import { useTranslations } from 'next-intl';
import SubNavigation from '@/app/components/common/SubNavigation';
import { TRAINING_TABS } from '@/app/(private)/hrm/constants';

export default function TrainingManagement() {
  const t = useTranslations('hrm');
  // 탭 이름은 메시지 키. 공통 SubNavigation 은 글자를 그대로 그린다
  const tabs = TRAINING_TABS.map((tab) => ({ ...tab, name: t(`tabs.${tab.name}`) }));
  return (
    <>
      <SubNavigation tabs={tabs} />
    </>
  );
}
