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

      {/* 활성 탭 내용. 이 칸이 스크롤 칸이다. 목록 탭은 최상위가 h-full 로 칸 높이를 받고 표가 flex-1 min-h-0
          로 남은 높이에 맞춰 줄어 표 안에서 스크롤하고(이 칸은 안 넘친다), 차트나 카드 격자처럼 줄지 않는
          내용은 여기서 스크롤된다. overflow-hidden 이면 넘친 내용을 볼 방법이 없다(카드 화면 아래가 잘리는 곳).
          안에 포커스 받을 요소가 없는 탭도 키보드로 스크롤되게 포커스를 받는 이름 있는 영역으로 둔다.
          ?tab= 이 없는 값이면 내용이 없으니 이름도 Tab 정지도 주지 않는다 */}
      <div
        role="region"
        aria-label={activeTab?.name}
        tabIndex={activeTab ? 0 : undefined}
        className="flex-1 min-h-0 mt-4 flex flex-col overflow-auto"
      >
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}
