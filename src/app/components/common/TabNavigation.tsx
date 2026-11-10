'use client';

import { type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type Tab } from '@/app/types/NavigationType';
import { useRole } from '@/app/hooks/useRole';
import { useTranslations } from 'next-intl';
import { getNavLabelKey } from '@/app/components/sidebar/SidebarNavigation';

interface TabNavigationProps {
  tabs: Tab[];
  /** 탭 바와 탭 내용 사이에 들어가는 페이지 공통 영역 (예: 통계 띠) */
  header?: ReactNode;
}

export default function TabNavigation({ tabs, header }: TabNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathName = usePathname(); // 현재 경로 (ex: "/purchase")
  const role = useRole();

  const currentTab = searchParams.get('tab') || tabs[0]?.id;
  const t = useTranslations('nav');
  const titleKey = getNavLabelKey(pathName, role);
  const pageTitle = titleKey ? t(titleKey) : undefined;

  const handelTabChange = (tabId: string) => {
    const params = new URLSearchParams();
    params.set('tab', tabId);
    const newUrl = `${pathName}?${params}`;
    router.replace(newUrl);
  };

  const activeTab = tabs.find((tab) => tab.id === currentTab);
  const ActiveComponent = activeTab?.component;

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-4">
      {/* 페이지 제목 + 탭 */}
      <div className="flex items-stretch gap-4 h-11 border-b border-gray-200 shrink-0">
        {pageTitle && (
          <h1 className="flex items-center text-base font-semibold text-gray-900 whitespace-nowrap">
            {pageTitle}
          </h1>
        )}
        <nav
          aria-label={t('tabsLabel', { title: pageTitle ?? '' })}
          className="flex items-stretch gap-1 -mb-px"
        >
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handelTabChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`px-2.5 text-sm border-b-2 cursor-pointer whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-500 text-gray-900 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {header && <div className="shrink-0">{header}</div>}

      {/* 활성 탭 내용 */}
      <div className="flex-1 min-h-0 mt-4 flex flex-col overflow-hidden">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}
