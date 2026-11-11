'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import Sidebar from '@/app/components/sidebar/Sidebar';
import { createQueryClient } from '@/lib/queryClient';
import { redirectToLogin } from '@/lib/auth/redirectToLogin';
import PrivateGuard from './_PrivateGuard';
import { useSidebarStore } from '@/store/sidebarStore';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

export const dynamic = 'force-dynamic';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const isExpanded = useSidebarStore((state) => state.isExpanded);
  // 서버 렌더와 첫 하이드레이션은 false, 그 뒤 창 크기를 따른다
  const isMobile = useMediaQuery('(max-width: 1023px)');

  // 사이드바(알림 버튼, 공급사와 고객사 프로필 모달)의 서버 상태. 도메인 레이아웃의 Provider 는 본문만 감싸서
  // 사이드바는 그 밖이다. 화면을 옮겨도 이 클라이언트는 남아 안 읽은 알림 수를 다시 받지 않는다.
  // 알림 키는 사이드바만 쓰므로 본문 쪽 클라이언트와 나뉘어도 어긋날 데이터가 없다(카드 알림 UI 연결, 결정 1)
  const [sidebarQueryClient] = useState(() =>
    createQueryClient({ onUnauthorized: redirectToLogin }),
  );

  return (
    <>
      <QueryClientProvider client={sidebarQueryClient}>
        <Sidebar />
      </QueryClientProvider>
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
