'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import type { userInfoResponse } from '@/app/(public)/callback/userInfoType';

// 로그인 여부는 서버가 판단한다.
// 브라우저에 남은 값(localStorage·zustand persist)은 표시용 캐시일 뿐이고, 매 진입마다 /api/auth/me 로 확인한다.
export default function PrivateGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const { setUserInfo, clearUserInfo } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
        if (cancelled) return;

        if (!res.ok) {
          clearUserInfo();
          router.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
          return;
        }

        const { user } = (await res.json()) as { user: userInfoResponse };
        if (cancelled) return;
        setUserInfo(user);
        setReady(true);
      } catch {
        if (!cancelled) router.replace('/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, setUserInfo, clearUserInfo]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
