// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { createOidcIdp } from './oidc';
import { CLIENT_ID, CLIENT_SECRET, ISSUER, installFakeIdp, type FakeIdp } from '../testing';

// 이 패키지 테스트 전용 MSW 서버. 가짜 IdP(discovery, JWKS, 토큰 엔드포인트)를 여기에 붙인다
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BACKCHANNEL = { 'http://schemas.openid.net/event/backchannel-logout': {} };

describe('OIDC 클라이언트', () => {
  let fake: FakeIdp;
  const idp = () =>
    createOidcIdp({ issuer: ISSUER, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
  beforeEach(async () => {
    fake = await installFakeIdp(server);
  });

  it('authorize 주소에 code 흐름과 PKCE(S256), state, nonce 가 들어간다', async () => {
    const url = new URL(
      await idp().authorizeUrl({
        state: 's1',
        nonce: 'n1',
        codeChallenge: 'c1',
        redirectUri: 'http://localhost:3100/api/auth/callback',
      }),
    );
    expect(url.origin + url.pathname).toBe(`${ISSUER}/protocol/openid-connect/auth`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: 'http://localhost:3100/api/auth/callback',
      scope: 'openid profile email',
      state: 's1',
      nonce: 'n1',
      code_challenge: 'c1',
      code_challenge_method: 'S256',
    });
  });

  it('code 교환은 verifier 와 client secret 을 form 으로 보내고 만료 시각을 계산한다', async () => {
    fake.respondWith({ access_token: 'a', refresh_token: 'r', id_token: 'i', expires_in: 60 });
    const before = Date.now();
    const tokens = await idp().exchangeCode('code1', 'verifier1', 'http://cb');
    const sent = Object.fromEntries(fake.tokenRequests[0]);
    expect(sent).toEqual({
      grant_type: 'authorization_code',
      code: 'code1',
      code_verifier: 'verifier1',
      redirect_uri: 'http://cb',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });
    expect(tokens).toMatchObject({ accessToken: 'a', refreshToken: 'r', idToken: 'i' });
    expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 60_000);
  });

  it('토큰 엔드포인트가 실패하면 던진다(세션을 만들지 않는다)', async () => {
    fake.respondWith({ error: 'invalid_grant' }, 400);
    await expect(idp().refresh('r')).rejects.toThrow('400');
  });

  it('ID 토큰: nonce 와 audience 를 확인하고 realm 역할을 꺼낸다', async () => {
    const token = await fake.sign({
      sub: 'u1',
      sid: 'idp-s1',
      nonce: 'n1',
      name: '홍길동',
      email: 'h@x',
      realm_access: { roles: ['ALL_ADMIN', 'offline_access'] },
    });
    await expect(idp().verifyIdToken(token, 'n1')).resolves.toEqual({
      sub: 'u1',
      sid: 'idp-s1',
      name: '홍길동',
      email: 'h@x',
      roles: ['ALL_ADMIN', 'offline_access'],
    });
    await expect(idp().verifyIdToken(token, 'other')).rejects.toThrow('nonce');
    const otherAudience = await fake.sign({ sub: 'u1', nonce: 'n1' }, { audience: 'someone-else' });
    await expect(idp().verifyIdToken(otherAudience, 'n1')).rejects.toThrow();
  });

  it('로그아웃 토큰: backchannel 이벤트가 있어야 하고 nonce 가 있으면 거절한다', async () => {
    const ok = await fake.sign({ sub: 'u1', sid: 'idp-s1', events: BACKCHANNEL });
    await expect(idp().verifyLogoutToken(ok)).resolves.toEqual({ sub: 'u1', sid: 'idp-s1' });
    const noEvent = await fake.sign({ sub: 'u1' });
    await expect(idp().verifyLogoutToken(noEvent)).rejects.toThrow('이벤트');
    const withNonce = await fake.sign({ sub: 'u1', events: BACKCHANNEL, nonce: 'x' });
    await expect(idp().verifyLogoutToken(withNonce)).rejects.toThrow('nonce');
  });

  it('IdP 로그아웃 주소에 id_token_hint 와 돌아올 주소를 넣는다', async () => {
    const url = new URL((await idp().endSessionUrl('idt', 'http://localhost:3100/login')) ?? '');
    expect(url.searchParams.get('id_token_hint')).toBe('idt');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3100/login');
  });
});
