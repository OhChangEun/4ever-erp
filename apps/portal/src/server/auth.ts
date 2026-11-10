import 'server-only';
import type { NextResponse } from 'next/server';
import {
  createMemorySessionStore,
  createOidcIdp,
  createShortLivedSigner,
  type IdentityProvider,
  type SessionData,
  type StoredSession,
} from '@everp/auth';
import { createOidcLoginFlow } from '@everp/auth/next';
import { pickPortalRole, safeReturnTo, type PortalRole } from './roles';

/**
 * 포털 인증 어댑터(SSO 포털 카드). erp 의 src/server/auth 와 같은 @everp/auth 를 쓴다.
 * 쿠키는 포트로 나뉘지 않는다. localhost:3100(erp)과 이름이 겹치지 않게 portal_ 을 붙인다.
 */
export const SESSION_COOKIE = 'portal_session';

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

let idp: IdentityProvider | null = null;
export const getIdp = (): IdentityProvider => {
  idp ??= createOidcIdp({
    issuer: requiredEnv('OIDC_ISSUER'),
    clientId: requiredEnv('OIDC_CLIENT_ID'),
    clientSecret: requiredEnv('OIDC_CLIENT_SECRET'),
  });
  return idp;
};

let secret: Uint8Array | null = null;
const getSecret = () => (secret ??= new TextEncoder().encode(requiredEnv('SESSION_SECRET')));

/** 레지스트리 이름이 erp 와 달라 한 프로세스에서 띄워도 섞이지 않는다 */
export const sessionStore = createMemorySessionStore<PortalRole>(
  60 * 60 * 8,
  'everp.portal.memorySessions',
);

export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

const cookieAttributes = () =>
  ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }) as const;

export const readSession = async (
  cookies: CookieReader,
): Promise<StoredSession<PortalRole> | null> => {
  const sid = cookies.get(SESSION_COOKIE)?.value;
  return sid ? sessionStore.get(sid) : null;
};

const startSession = async (res: NextResponse, data: SessionData<PortalRole>) => {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: await sessionStore.create(data),
    maxAge: sessionStore.maxAgeSeconds,
    ...cookieAttributes(),
  });
};

/** 세션을 지우고 쿠키도 지운다. 지운 세션을 돌려준다(IdP 로그아웃 주소에 id token 이 필요하다) */
export const endSession = async (res: NextResponse, cookies: CookieReader) => {
  const sid = cookies.get(SESSION_COOKIE)?.value;
  const ended = sid ? await sessionStore.get(sid) : null;
  if (sid) await sessionStore.delete(sid);
  res.cookies.set({ name: SESSION_COOKIE, value: '', maxAge: 0, ...cookieAttributes() });
  return ended;
};

export const loginFlow = createOidcLoginFlow<PortalRole>({
  getIdp,
  signer: createShortLivedSigner(getSecret),
  pickRole: pickPortalRole,
  startSession,
  safeReturnTo,
  loginPath: '/signed-out',
  txCookie: 'portal_oidc_tx',
});
