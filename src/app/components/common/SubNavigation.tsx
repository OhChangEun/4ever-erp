'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type Tab } from '@/app/types/NavigationType';

interface SubNavigationProps {
  tabs: Tab[];
  paramName?: string; // 사용할 쿼리 파라미터 이름 (기본값: 'subTab')
}

export default function SubNavigation({ tabs, paramName = 'subTab' }: SubNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathName = usePathname();

  // 지정된 파라미터 이름으로 현재 탭 확인
  const currentTab = searchParams.get(paramName) || tabs[0]?.id;

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, tabId);
    const newUrl = `${pathName}?${params}`;
    router.replace(newUrl);
  };

  const activeTab = tabs.find((tab) => tab.id === currentTab);
  const ActiveComponent = activeTab?.component;

  return (
    <div className="flex flex-col h-full">
      {/* 네비게이션바 */}
      <nav className="-mb-px border-b border-gray-200 flex space-x-6 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`group inline-flex items-center pt-2 pb-2 px-1 border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap ${
              currentTab === tab.id
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <i className={`${tab.icon} mr-2 text-lg`}></i>
            {tab.name}
          </button>
        ))}
      </nav>
      {/* 렌더링 되는 컴포넌트 */}
      <div className="flex-1 min-h-0 mt-4">{ActiveComponent && <ActiveComponent />}</div>
    </div>
  );
}
