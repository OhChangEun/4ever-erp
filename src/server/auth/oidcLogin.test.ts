// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { CLIENT_ID, CLIENT_SECRET, ISSUER, installFakeIdp, type FakeIdp } from '@/test/fakeIdp';
import { finishOidcLogin, pickRole, startOidcLogin } from './oidcLogin';
import { SESSION_COOKIE, readSession } from './session';
import { POST as backchannelLogout } from '@/app/api/auth/backchannel-logout/route';

const APP = 'http://localhost:3100';
const BACKCHANNEL = { 'http://schemas.openid.net/event/backchannel-logout': {} };

beforeAll(() => {
  vi.stubEnv('AUTH_PROVIDER', 'oidc');
  vi.stubEnv('OIDC_ISSUER', ISSUER);
  vi.stubEnv('OIDC_CLIENT_ID', CLIENT_ID);
  vi.stubEnv('OIDC_CLIENT_SECRET', CLIENT_SECRET);
});
afterAll(() => vi.unstubAllEnvs());

/** 로그인을 시작해 IdP 로 가는 주소의 state, nonce 와 트랜잭션 쿠키를 꺼낸다 */
const begin = async (returnTo = '/purchase') => {
  const res = await startOidcLogin(new NextRequest(`${APP}/api/auth/login?returnTo=${returnTo}`));
  const authorize = new URL(res.headers.get('location') ?? '');
  const tx = res.cookies.get('oidc_tx');
  return {
    state: authorize.searchParams.get('state') ?? '',
    nonce: authorize.searchParams.get('nonce') ?? '',
    challenge: authorize.searchParams.get('code_challenge') ?? '',
    txCookie: tx?.value ?? '',
    txHttpOnly: tx?.httpOnly,
  };
};

const callback = (query: string, txCookie?: string) =>
  finishOidcLogin(
    new NextRequest(`${APP}/api/auth/callback?${query}`, {
      headers: txCookie ? { cookie: `oidc_tx=${txCookie}` } : {},
    }),
  );

const sessionReader = (sid: string | undefined) => ({
  get: (name: string) => (name === SESSION_COOKIE && sid ? { value: sid } : undefined),
});

describe('OIDC 로그인 흐름', () => {
  let fake: FakeIdp;
  beforeEach(async () => {
    fake = await installFakeIdp();
  });

  const tokensFor = async (nonce: string, roles: string[]) => ({
    access_token: 'access-1',
    refresh_token: 'refresh-1',
    expires_in: 60,
    id_token: await fake.sign({
      sub: 'kc-user-1',
      sid: 'idp-s1',
      nonce,
      name: '공급사',
      realm_access: { roles },
    }),
  });

  it('성공: code 를 바꾸고 sid 쿠키만 심은 뒤 returnTo 로 보낸다. 토큰은 서버에만 있다', async () => {
    const { state, nonce, challenge, txCookie, txHttpOnly } = await begin('/purchase');
    expect(txHttpOnly).toBe(true);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    fake.respondWith(await tokensFor(nonce, ['SUPPLIER_ADMIN']));

    const res = await callback(`code=c1&state=${state}`, txCookie);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`${APP}/purchase`);
    const sid = res.cookies.get(SESSION_COOKIE)?.value;
    expect(sid).toMatch(/^[A-Za-z0-9_-]{43}$/); // 쿠키엔 토큰이 아니라 sid
    expect(sid).not.toContain('access-1');
    // PKCE: 토큰 요청의 verifier 가 처음 보낸 challenge 와 짝이다(서버가 보관한 값)
    expect(fake.tokenRequests[0].get('code_verifier')).toBeTruthy();

    const session = await readSession(sessionReader(sid));
    expect(session).toMatchObject({
      sub: 'kc-user-1',
      role: 'SUPPLIER_ADMIN',
      name: '공급사',
      upstreamToken: 'access-1',
    });
  });

  it('state 가 다르면 세션을 만들지 않고 로그인 화면으로 오류와 함께 보낸다', async () => {
    const { txCookie } = await begin();
    const res = await callback('code=c1&state=forged', txCookie);
    expect(res.headers.get('location')).toBe(`${APP}/login?error=state_mismatch`);
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it('트랜잭션 쿠키가 없으면(콜백 두 번째, 10분 지남) 거절한다', async () => {
    const { state } = await begin();
    const res = await callback(`code=c1&state=${state}`);
    expect(res.headers.get('location')).toBe(`${APP}/login?error=invalid_transaction`);
  });

  it('역할 표에 있는 역할이 없으면 no_role', async () => {
    const { state, nonce, txCookie } = await begin();
    fake.respondWith(await tokensFor(nonce, ['offline_access']));
    const res = await callback(`code=c1&state=${state}`, txCookie);
    expect(res.headers.get('location')).toBe(`${APP}/login?error=no_role`);
  });

  it('외부 returnTo 는 /dashboard 로 바꾼다', async () => {
    const { state, nonce, txCookie } = await begin('//evil.com');
    fake.respondWith(await tokensFor(nonce, ['ALL_ADMIN']));
    const res = await callback(`code=c1&state=${state}`, txCookie);
    expect(res.headers.get('location')).toBe(`${APP}/dashboard`);
  });

  it('백채널 로그아웃: IdP 가 서명한 logout_token 이 오면 그 IdP 세션의 앱 세션을 지운다', async () => {
    const { state, nonce, txCookie } = await begin();
    fake.respondWith(await tokensFor(nonce, ['ALL_ADMIN']));
    const sid = (await callback(`code=c1&state=${state}`, txCookie)).cookies.get(
      SESSION_COOKIE,
    )?.value;
    await expect(readSession(sessionReader(sid))).resolves.not.toBeNull();

    const form = new URLSearchParams({
      logout_token: await fake.sign({ sid: 'idp-s1', events: BACKCHANNEL }),
    });
    const res = await backchannelLogout(
      new NextRequest(`${APP}/api/auth/backchannel-logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form,
      }),
    );
    expect(res.status).toBe(200);
    await expect(readSession(sessionReader(sid))).resolves.toBeNull();
  });

  it('위조한 logout_token 은 400 이고 세션은 남는다', async () => {
    const form = new URLSearchParams({ logout_token: 'not-a-jwt' });
    const res = await backchannelLogout(
      new NextRequest(`${APP}/api/auth/backchannel-logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form,
      }),
    );
    expect(res.status).toBe(400);
  });

  it('역할 고르기: 표 순서상 앞의 역할', () => {
    expect(pickRole(['FCM_USER', 'ALL_ADMIN'])).toBe('ALL_ADMIN');
    expect(pickRole(['uma_authorization'])).toBeNull();
  });
});
