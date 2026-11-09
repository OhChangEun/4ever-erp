'use client';

import Sidebar from '@/app/components/sidebar/Sidebar';
import PrivateGuard from './_PrivateGuard';
import { useSidebarStore } from '@/store/sidebarStore';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

export const dynamic = 'force-dynamic';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const isExpanded = useSidebarStore((state) => state.isExpanded);
  // 서버 렌더와 첫 하이드레이션은 false, 그 뒤 창 크기를 따른다
  const isMobile = useMediaQuery('(max-width: 1023px)');

  return (
    <>
      <Sidebar />
      <div
        className="flex flex-col transition-all duration-300"
        style={{
          marginLeft: isMobile ? '0' : isExpanded ? '224px' : '64px',
        }}
      >
        <main className="h-screen overflow-auto bg-gray-50 flex flex-col">
          <PrivateGuard>{children}</PrivateGuard>
        </main>
      </div>
    </>
  );
}

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <LayoutContent>{children}</LayoutContent>;
}
