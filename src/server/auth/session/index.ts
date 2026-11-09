import 'server-only';
import type { NextResponse } from 'next/server';
import { cookieSessionStore } from './cookieStore';
import type { SessionData, SessionStore, StoredSession } from './store';

/**
 * 세션 처리 한 곳(인증 3단계 카드). 페이지 프록시, API 프록시, 로그인, 로그아웃, me 가 이 함수들만 쓴다.
 * 쿠키 이름과 옵션은 여기에만 있다. 저장소를 바꾸려면 sessionStore() 만 고친다.
 */
export const SESSION_COOKIE = 'session';

export type { SessionData, StoredSession };

/** 요청 쿠키를 읽는 최소 모양. NextRequest.cookies 와 next/headers 의 cookies() 둘 다 맞는다 */
export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

const sessionStore = (): SessionStore => cookieSessionStore;

export const readSession = async (cookies: CookieReader): Promise<StoredSession | null> => {
  const value = cookies.get(SESSION_COOKIE)?.value;
  return value ? sessionStore().get(value) : null;
};

export const startSession = async (res: NextResponse, data: SessionData): Promise<void> => {
  const store = sessionStore();
  res.cookies.set({
    name: SESSION_COOKIE,
    value: await store.create(data),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: store.maxAgeSeconds,
  });
};

/** 저장소의 세션을 지우고 쿠키를 지운다. name 과 path 가 심을 때와 같아야 브라우저가 같은 쿠키로 본다 */
export const endSession = async (res: NextResponse, cookies: CookieReader): Promise<void> => {
  const value = cookies.get(SESSION_COOKIE)?.value;
  if (value) await sessionStore().delete(value);
  res.cookies.delete({ name: SESSION_COOKIE, path: '/' });
};

/** 쿠키는 있는데 세션이 없을 때(깨짐, 만료) 쿠키만 지운다 */
export const clearSessionCookie = (res: NextResponse): void => {
  res.cookies.delete({ name: SESSION_COOKIE, path: '/' });
};
