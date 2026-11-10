'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { readUserResponse } from '@/lib/auth/userInfo';

// 로그인 여부는 서버가 판단한다.
// 브라우저에 남은 값(localStorage·zustand persist)은 표시용 캐시일 뿐이고, 매 진입마다 /api/auth/me 로 확인한다.
export default function PrivateGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const { setUserInfo, clearUserInfo } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // 정리 함수가 나중에 바꾸는 값이라 함수로 읽는다. 변수로 읽으면 TS 가 첫 검사 뒤 false 로 좁혀
    // 두 번째 검사를 '항상 거짓'으로 본다(린트 오판)
    let cancelled = false;
    const isCancelled = () => cancelled;

    void (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
        if (isCancelled()) return;

        if (!res.ok) {
          clearUserInfo();
          router.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
          return;
        }

        const user = readUserResponse(await res.json());
        if (isCancelled()) return;
        // 모양이 틀린 응답으로 화면을 열지 않는다. 세션 없음과 같이 로그인으로 보낸다
        if (!user) {
          clearUserInfo();
          router.replace('/login');
          return;
        }
        setUserInfo(user);
        setReady(true);
      } catch {
        if (!isCancelled()) router.replace('/login');
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
