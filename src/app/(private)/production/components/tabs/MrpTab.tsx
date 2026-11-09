'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MRP_TABS } from '@/app/(private)/production/constants';
import TabButtons from '@/app/components/common/TabButtons';

export default function MrpTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathName = usePathname();

  const currentSubTab = searchParams.get('subTab') || MRP_TABS[0]?.id;

  const handleSubTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('subTab', tabId);
    router.replace(`${pathName}?${params}`);
  };

  const activeTab = MRP_TABS.find((tab) => tab.id === currentSubTab);
  const ActiveComponent = activeTab?.component;

  const tabButtons = (
    <TabButtons
      tabs={MRP_TABS.map(({ id, name, icon }) => ({ id, name, icon }))}
      activeTab={currentSubTab}
      onTabChange={handleSubTabChange}
    />
  );

  return (
    <div className="flex flex-col h-full">
      {ActiveComponent && <ActiveComponent tabButtons={tabButtons} />}
    </div>
  );
}
