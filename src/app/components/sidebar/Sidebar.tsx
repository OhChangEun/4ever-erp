'use client';

import { useEffect } from 'react';
import SidebarNavigation from './SidebarNavigation';
import SidebarProfile from './SidebarProfile';
import Logo from '@/app/components/header/Logo';
import { useSidebarStore } from '@/store/sidebarStore';

export default function Sidebar() {
  const { isExpanded, toggleSidebar, setExpanded } = useSidebarStore();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      if (mobile && isExpanded) {
        setExpanded(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isExpanded, setExpanded]);

  return (
    <>
      {/* 모바일 햄버거 버튼 (플로팅) */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 left-4 z-overlay lg:hidden p-3 bg-white rounded-lg shadow-lg border border-gray-200 transition-opacity ${
          isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="메뉴 열기"
      >
        <i className="ri-menu-line text-xl text-gray-600" />
      </button>

      {/* 모바일 오버레이 */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-header lg:hidden transition-opacity duration-300 ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setExpanded(false)}
      />

      {/* 사이드바 */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-sidebar transition-all duration-300 ease-in-out flex flex-col
          lg:translate-x-0 ${
            isExpanded ? 'w-64 translate-x-0' : 'w-16 lg:translate-x-0 -translate-x-full'
          }`}
      >
        {/* 사이드바 헤더 */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 shrink-0">
          <div
            className={`transition-all duration-300 overflow-hidden ${
              isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
            }`}
          >
            <Logo />
          </div>
          <button
            onClick={toggleSidebar}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            aria-label={isExpanded ? '사이드바 접기' : '사이드바 펼치기'}
          >
            <i
              className={`text-2xl text-gray-500 font-light ${
                isExpanded ? 'ri-arrow-left-double-line' : 'ri-arrow-right-double-line'
              }`}
            />
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <SidebarNavigation isExpanded={isExpanded} />
        </nav>

        {/* 프로필 영역 */}
        <SidebarProfile isExpanded={isExpanded} />
      </aside>
    </>
  );
}
