'use client';

import { useEffect, useState } from 'react';
import { useSidebarStore } from '@/store/sidebarStore';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const { isExpanded, toggleSidebar } = useSidebarStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDesktop();
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkDesktop);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkDesktop);
    };
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 z-header transition-all duration-300 border-b border-gray-200 ${
        isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-white/80 backdrop-blur-sm'
      } lg:left-auto`}
      style={{
        left: isDesktop ? (isExpanded ? '256px' : '64px') : '0',
      }}
    >
      <div className="min-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 모바일 햄버거 메뉴 */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="메뉴 열기"
          >
            <i className="ri-menu-line text-2xl text-gray-600" />
          </button>

          {/* 빈 공간 유지 (필요시 알림 등 추가 가능) */}
          <div className="flex-1" />
        </div>
      </div>
    </header>
  );
}
