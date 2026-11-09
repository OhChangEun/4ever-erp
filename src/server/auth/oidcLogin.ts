import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ROLES, type Role } from '@/lib/authz/policy';
import { signShortLived, verifyShortLived } from '@/lib/auth/session';
import { safeReturnTo } from '@/lib/auth/returnTo';
import { getIdp } from './config';
import { createCodeChallenge, generateRandomBase64Url } from './pkce';
import { startSession } from './session';

/**
 * OIDC Authorization Code + PKCE 로그인(인증 4단계 카드, BFF 문서 Phase 3-1, 3-2).
 * 로그인 시작 때 만든 state, nonce, code_verifier, returnTo 를 10분짜리 서명 쿠키에 두고
 * 콜백에서 같은 브라우저인지(state), 같은 로그인인지(nonce) 확인한다.
 */
const TX_COOKIE = 'oidc_tx';
const TX_PATH = '/api/auth';

const callbackUrl = (req: NextRequest) => new URL('/api/auth/callback', req.url).toString();

const loginErrorRedirect = (req: NextRequest, error: string) => {
  const url = new URL('/login', req.url);
  url.searchParams.set('error', error);
  const res = NextResponse.redirect(url, 303);
  res.cookies.delete({ name: TX_COOKIE, path: TX_PATH });
  return res;
};

/** 토큰의 역할 중 역할 표에 있는 첫 번째(표 순서, ALL_ADMIN 이 먼저). 없으면 null */
export const pickRole = (roles: readonly string[]): Role | null =>
  ROLES.find((role) => roles.includes(role)) ?? null;

export const startOidcLogin = async (req: NextRequest): Promise<NextResponse> => {
  const state = generateRandomBase64Url(32);
  const nonce = generateRandomBase64Url(32);
  const verifier = generateRandomBase64Url(32);
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get('returnTo'));

  const authorizeUrl = await getIdp().authorizeUrl({
    state,
    nonce,
    codeChallenge: await createCodeChallenge(verifier),
    redirectUri: callbackUrl(req),
  });

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set({
    name: TX_COOKIE,
    // 서명한다: 쿠키를 바꿔 다른 verifier 나 외부 returnTo 를 끼워 넣지 못하게
    value: await signShortLived({ state, nonce, verifier, returnTo }, '10m'),
    httpOnly: true,
    // IdP 에서 돌아오는 최상위 GET 이동에는 lax 쿠키가 실린다
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: TX_PATH,
    maxAge: 600,
  });
  return res;
};

const readTransaction = async (req: NextRequest) => {
  const raw = req.cookies.get(TX_COOKIE)?.value;
  const claims = raw ? await verifyShortLived(raw) : null;
  if (!claims) return null;
  const { state, nonce, verifier, returnTo } = claims;
  if (
    typeof state !== 'string' ||
    typeof nonce !== 'string' ||
    typeof verifier !== 'string' ||
    typeof returnTo !== 'string'
  ) {
    return null;
  }
  return { state, nonce, verifier, returnTo };
};

export const finishOidcLogin = async (req: NextRequest): Promise<NextResponse> => {
  const params = req.nextUrl.searchParams;
  // IdP 가 거절했다(사용자가 취소, 권한 없음 등)
  const idpError = params.get('error');
  if (idpError) return loginErrorRedirect(req, idpError);

  // 트랜잭션 쿠키가 없거나 깨졌다: 콜백을 두 번 열었거나 10분이 지났거나 위조
  const tx = await readTransaction(req);
  if (!tx) return loginErrorRedirect(req, 'invalid_transaction');
  // 다른 브라우저에서 시작한 로그인의 code 를 끼워 넣는 공격(CSRF) 차단
  if (params.get('state') !== tx.state) return loginErrorRedirect(req, 'state_mismatch');

  const code = params.get('code');
  if (!code) return loginErrorRedirect(req, 'missing_code');

  try {
    const idp = getIdp();
    const tokens = await idp.exchangeCode(code, tx.verifier, callbackUrl(req));
    if (!tokens.idToken) return loginErrorRedirect(req, 'missing_id_token');
    const claims = await idp.verifyIdToken(tokens.idToken, tx.nonce);
    const role = pickRole(claims.roles);
    if (!role) return loginErrorRedirect(req, 'no_role');

    const res = NextResponse.redirect(new URL(safeReturnTo(tx.returnTo), req.url), 303);
    res.cookies.delete({ name: TX_COOKIE, path: TX_PATH });
    await startSession(res, {
      sub: claims.sub,
      role,
      name: claims.name,
      email: claims.email,
      idpSid: claims.sid,
      tokens,
    });
    return res;
  } catch (error) {
    console.error('[auth] OIDC 콜백 실패', error);
    return loginErrorRedirect(req, 'callback_failed');
  }
};
