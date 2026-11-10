import 'server-only';
import type { NextResponse } from 'next/server';
import { authProvider, getIdp } from '../config';
import { cookieSessionStore } from './cookieStore';
import { memorySessionStore } from './memoryStore';
import { ensureFreshSession } from '@everp/auth';
import type { SessionData, SessionStore, StoredSession } from './store';

/**
 * 세션 처리 한 곳(인증 3단계 카드). 페이지 프록시, API 프록시, 로그인, 로그아웃, me 가 이 함수들만 쓴다.
 * 쿠키 이름과 옵션은 여기에만 있다. 저장소를 바꾸려면 sessionStore() 만 고친다.
 */
// 운영(https)은 __Host- 접두사. 브라우저가 Secure, Path=/, Domain 없음을 강제해 서브도메인이 같은 이름의
// 쿠키를 심어 바꿔치기하는 것(cookie tossing)을 막는다. 개발 http 는 Secure 를 못 걸어 접두사 없이(결정 7)
export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-session' : 'session';

export type { SessionData, StoredSession };

/** 요청 쿠키를 읽는 최소 모양. NextRequest.cookies 와 next/headers 의 cookies() 둘 다 맞는다 */
export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

/** 데모는 서명 JWT 쿠키(상태 없음, Vercel), OIDC 는 sid 쿠키 + 서버 메모리(결정 9) */
const sessionStore = (): SessionStore =>
  authProvider() === 'oidc' ? memorySessionStore : cookieSessionStore;

export const readSession = async (cookies: CookieReader): Promise<StoredSession | null> => {
  const value = cookies.get(SESSION_COOKIE)?.value;
  return value ? sessionStore().get(value) : null;
};

/**
 * 업스트림에 보낼 세션. OIDC 세션은 access token 이 30초 안에 만료되면 갱신한다(sid 별 single-flight).
 * 갱신이 실패하면 세션을 지우고 null. API 프록시만 쓴다(페이지 프록시는 세션 유무와 역할만 본다).
 */
export const readFreshSession = async (cookies: CookieReader): Promise<StoredSession | null> => {
  const sid = cookies.get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const store = sessionStore();
  const session = await store.get(sid);
  if (!session?.tokens) return session;
  return ensureFreshSession(sid, session, store, getIdp());
};

/**
 * 심을 때와 지울 때 같은 속성. __Host- 쿠키는 지우는 Set-Cookie 에도 Secure 와 Path=/ 가 있어야 브라우저가
 * 받아들인다. 리뷰 지적(P1): res.cookies.delete 는 Secure 를 안 붙여 운영에서 로그아웃이 쿠키를 못 지웠다
 */
const cookieAttributes = () =>
  ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }) as const;

const deleteSessionCookie = (res: NextResponse) =>
  res.cookies.set({ name: SESSION_COOKIE, value: '', maxAge: 0, ...cookieAttributes() });

export const startSession = async (res: NextResponse, data: SessionData): Promise<void> => {
  const store = sessionStore();
  res.cookies.set({
    name: SESSION_COOKIE,
    value: await store.create(data),
    maxAge: store.maxAgeSeconds,
    ...cookieAttributes(),
  });
};

/**
 * 저장소의 세션을 지우고 쿠키를 지운다. name 과 path 가 심을 때와 같아야 브라우저가 같은 쿠키로 본다.
 * 지운 세션을 돌려준다(OIDC 로그아웃이 id token 으로 IdP 로그아웃 주소를 만든다).
 */
export const endSession = async (
  res: NextResponse,
  cookies: CookieReader,
): Promise<StoredSession | null> => {
  const value = cookies.get(SESSION_COOKIE)?.value;
  const store = sessionStore();
  const ended = value ? await store.get(value) : null;
  if (value) await store.delete(value);
  deleteSessionCookie(res);
  return ended;
};

/** 백채널 로그아웃. IdP 가 알려 준 사용자나 IdP 세션의 앱 세션을 모두 지운다 */
export const endSessionsMatching = (match: { sub?: string; idpSid?: string }): Promise<void> =>
  sessionStore().deleteMatching(match);

/** 쿠키는 있는데 세션이 없을 때(깨짐, 만료) 쿠키만 지운다 */
export const clearSessionCookie = (res: NextResponse): void => {
  deleteSessionCookie(res);
};
