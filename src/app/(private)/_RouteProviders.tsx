'use client';

import Providers from '@/app/providers';

/**
 * 도메인 레이아웃마다 QueryClient 를 새로 만든다(결정 2026-11-24 화면끼리 캐시). 도메인을 옮기면 캐시가 사라져 들어갈 때마다 서버 값을 받는다.
 * 그래서 다른 도메인 키를 무효화하지 않는다. 지울 캐시가 그 클라이언트에 없다.
 * 루트 레이아웃이나 모듈 변수에 두면 안 된다. 로그아웃이 전체 새로고침이 아니라 앞사람 값이 다음 사람에게 보인다(e2e/domain-cache.spec.ts).
 */
export default function RouteProviders({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
