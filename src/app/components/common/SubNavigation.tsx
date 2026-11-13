'use client';
import { type ComponentType, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TabButtons } from '@everp/ui';

/** 하위 탭 하나. 화면은 받은 tabButtons 를 자기 툴바 왼쪽에 놓는다 */
export interface SubTab {
  id: string;
  name: string;
  component: ComponentType<{ tabButtons?: ReactNode }>;
}

interface SubNavigationProps {
  /** 세그먼트 묶음 이름(예: "직원관리 탭") */
  label: string;
  tabs: SubTab[];
  paramName?: string; // 사용할 쿼리 파라미터 이름 (기본값: 'subTab')
}

/**
 * 하위 탭(인사 직원, 근태, 교육관리와 생산 MRP). 2단 탭으로 쌓지 않고 세그먼트(TabButtons)를 활성 화면에
 * 넘겨 툴바 왼쪽에 두게 한다(디자인 지침 12장 화면 뼈대). 고른 탭은 주소 ?subTab= 에 남는다.
 */
export default function SubNavigation({ label, tabs, paramName = 'subTab' }: SubNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathName = usePathname();

  // 없는 id(예전 주소, 다른 화면의 하위 탭)는 첫 탭으로 본다
  const activeTab = tabs.find((tab) => tab.id === searchParams.get(paramName)) ?? tabs[0];
  const ActiveComponent = activeTab.component;

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, tabId);
    router.replace(`${pathName}?${params}`);
  };

  return (
    <div className="flex flex-col h-full">
      <ActiveComponent
        tabButtons={
          <TabButtons
            label={label}
            tabs={tabs}
            activeTab={activeTab.id}
            onTabChange={handleTabChange}
          />
        }
      />
    </div>
  );
}
