'use client';

import React from 'react';
import Providers from '@/app/providers';
import Sidebar from '@/app/components/sidebar/Sidebar';
import { useSidebarStore } from '@/store/sidebarStore';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

function ProfileLayoutContent({ children }: { children: React.ReactNode }) {
  const isExpanded = useSidebarStore((state) => state.isExpanded);
  // 서버 렌더와 첫 하이드레이션은 false, 그 뒤 창 크기를 따른다
  const isMobile = useMediaQuery('(max-width: 1023px)');

  return (
    <>
      <Sidebar />
      <div
        className="flex flex-col transition-all duration-300"
        style={{
          marginLeft: isMobile ? '0' : isExpanded ? '256px' : '64px',
        }}
      >
        <main className="min-h-screen bg-gray-50">{children}</main>
      </div>
    </>
  );
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ProfileLayoutContent>{children}</ProfileLayoutContent>
    </Providers>
  );
}
