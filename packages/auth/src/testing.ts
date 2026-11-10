import { SignJWT, exportJWK, generateKeyPair, type CryptoKey } from 'jose';
import { http, HttpResponse } from 'msw';
import type { SetupServer } from 'msw/node';

/**
 * 테스트용 OIDC IdP. discovery, JWKS, 토큰 엔드포인트를 MSW 로 흉내 내고 RS256 으로 토큰에 서명한다.
 * 실제 Keycloak 확인은 e2e(OIDC 프로젝트)가 한다. MSW 서버는 쓰는 쪽(앱, 이 패키지 테스트)이 넘긴다.
 */
export const ISSUER = 'http://idp.test/realms/everp';
export const CLIENT_ID = 'everp-bff';
export const CLIENT_SECRET = 'test-client-secret';

export interface FakeIdp {
  sign(
    claims: Record<string, unknown>,
    options?: { audience?: string; issuer?: string },
  ): Promise<string>;
  /** 토큰 엔드포인트가 받은 form 본문 */
  tokenRequests: URLSearchParams[];
  /** 다음 토큰 응답을 정한다 */
  respondWith(body: Record<string, unknown>, status?: number): void;
}

// 키는 프로세스(테스트 파일)마다 한 번만 만든다. 앱의 IdP 클라이언트가 JWKS 를 캐시하므로
// 같은 kid 로 키가 바뀌면 검증이 실패한다(실제 IdP 도 키를 바꿀 땐 kid 를 바꾼다)
let keys: Promise<CryptoKeyPair> | null = null;
interface CryptoKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

/** MSW 핸들러는 테스트마다 초기화되므로(vitest.setup) 각 테스트의 beforeEach 에서 부른다 */
export const installFakeIdp = async (server: SetupServer): Promise<FakeIdp> => {
  keys ??= generateKeyPair('RS256');
  const { privateKey, publicKey } = await keys;
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  const tokenRequests: URLSearchParams[] = [];
  let next: { body: Record<string, unknown>; status: number } = { body: {}, status: 200 };

  server.use(
    http.get(`${ISSUER}/.well-known/openid-configuration`, () =>
      HttpResponse.json({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/protocol/openid-connect/auth`,
        token_endpoint: `${ISSUER}/protocol/openid-connect/token`,
        end_session_endpoint: `${ISSUER}/protocol/openid-connect/logout`,
        jwks_uri: `${ISSUER}/protocol/openid-connect/certs`,
      }),
    ),
    http.get(`${ISSUER}/protocol/openid-connect/certs`, () => HttpResponse.json({ keys: [jwk] })),
    http.post(`${ISSUER}/protocol/openid-connect/token`, async ({ request }) => {
      tokenRequests.push(new URLSearchParams(await request.text()));
      return HttpResponse.json(next.body, { status: next.status });
    }),
  );

  const signWith =
    (key: CryptoKey) =>
    (claims: Record<string, unknown>, options: { audience?: string; issuer?: string } = {}) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
        .setIssuer(options.issuer ?? ISSUER)
        .setAudience(options.audience ?? CLIENT_ID)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(key);

  return {
    sign: signWith(privateKey),
    tokenRequests,
    respondWith: (body, status = 200) => {
      next = { body, status };
    },
  };
};
