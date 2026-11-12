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

  // 지정된 파라미터 이름으로 현재 탭 확인. 없는 id(예전 주소, 다른 화면의 하위 탭)는 첫 탭으로 본다
  const requested = searchParams.get(paramName);
  const currentTab = tabs.some((tab) => tab.id === requested) ? requested : tabs[0]?.id;

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
      {/* 네비게이션바. 버튼의 -mb-px 로 활성 밑줄을 nav 의 회색 선 위에 겹쳐 한 겹으로 보이게 한다 */}
      {/* nav 에 overflow(가로 스크롤 등)를 붙이면 내려온 밑줄 1px 이 잘린다. 그때는 회색 선을 바깥 div 로 옮기고 -mb-px 를 nav 에 둔다(TabNavigation 방식) */}
      <nav className="border-b border-gray-200 flex space-x-6 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`group inline-flex items-center pt-2 pb-2 px-1 -mb-px border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap ${
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
