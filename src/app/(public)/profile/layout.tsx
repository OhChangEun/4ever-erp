'use client';

import React from 'react';
import Providers from '@/app/providers';
import Sidebar from '@/app/components/sidebar/Sidebar';
import { useSidebarStore } from '@/store/sidebarStore';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';
import ProfileMessages from './ProfileMessages';

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
  // 메시지가 바깥이어야 한다. 토스트와 모달은 Providers 안에서 그려진다(영업 레이아웃과 같은 순서)
  return (
    <ProfileMessages>
      <Providers>
        <ProfileLayoutContent>{children}</ProfileLayoutContent>
      </Providers>
    </ProfileMessages>
  );
}
