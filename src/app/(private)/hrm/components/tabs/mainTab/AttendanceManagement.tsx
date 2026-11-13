'use client';

import { useTranslations } from 'next-intl';
import SubNavigation from '@/app/components/common/SubNavigation';
import { ATTENDANCE_TABS } from '@/app/(private)/hrm/constants';

export default function AttendanceManagement() {
  const t = useTranslations('hrm');
  const tNav = useTranslations('nav');
  // 탭 이름은 메시지 키. 공통 SubNavigation 은 글자를 그대로 그린다
  const tabs = ATTENDANCE_TABS.map((tab) => ({ ...tab, name: t(`tabs.${tab.name}`) }));
  return (
    <>
      <SubNavigation label={tNav('tabsLabel', { title: t('tabs.attendance') })} tabs={tabs} />
    </>
  );
}
