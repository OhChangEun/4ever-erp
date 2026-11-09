import { useAuthStore } from '@/store/authStore';

/**
 * 세션이 끝났을 때(API 401) 로그인으로 보낸다. QueryCache 안이라 라우터가 없어 전체 새로고침을 쓴다.
 * 새로고침이 쿼리 캐시와 메모리 상태를 다 비우므로 만료 뒤 남는 값이 없다.
 * returnTo 는 로그인 페이지가 내부 경로만 받는다(src/app/(public)/login/page.tsx readReturnTo).
 */
export const redirectToLogin = (): void => {
  if (typeof window === 'undefined') return;
  useAuthStore.getState().clearUserInfo();
  const returnTo = `${window.location.pathname}${window.location.search}`;
  const login = new URL('/login', window.location.origin);
  login.searchParams.set('returnTo', returnTo);
  // 라우터 push 가 아니라 전체 새로고침을 일부러 쓴다. 만료된 세션의 캐시와 메모리 상태를 다 버리기 위해서다.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 위 이유. 절대 URL 이고 같은 origin
  window.location.assign(login.toString());
};
