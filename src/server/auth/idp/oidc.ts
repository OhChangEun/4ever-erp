import 'server-only';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { z } from 'zod';
import type { IdTokenClaims, IdentityProvider, LogoutClaims, TokenSet } from './types';

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
}

const discoverySchema = z.looseObject({
  issuer: z.string(),
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
  jwks_uri: z.string(),
  end_session_endpoint: z.string().optional(),
});

const tokenResponseSchema = z.looseObject({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
});

const BACKCHANNEL_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

const realmRolesOf = (payload: JWTPayload): string[] => {
  const realmAccess = payload.realm_access;
  if (typeof realmAccess !== 'object' || realmAccess === null) return [];
  const roles: unknown = Reflect.get(realmAccess, 'roles');
  return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
};

const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);

/**
 * OIDC Authorization Code + PKCE 클라이언트(confidential). discovery 로 엔드포인트를 찾고
 * ID 토큰과 로그아웃 토큰은 IdP 의 JWKS 로 검증한다(issuer, audience, 알고리즘 고정).
 */
export const createOidcIdp = (config: OidcConfig): IdentityProvider => {
  let discovery: Promise<z.infer<typeof discoverySchema>> | null = null;
  let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  const discover = () => {
    discovery ??= fetch(`${config.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`OIDC discovery 실패: ${res.status}`);
        return discoverySchema.parse(await res.json());
      })
      .catch((error: unknown) => {
        discovery = null; // 다음 요청에서 다시 시도
        throw error;
      });
    return discovery;
  };

  const keySet = async () => {
    const meta = await discover();
    jwks ??= createRemoteJWKSet(new URL(meta.jwks_uri));
    return jwks;
  };

  const verify = async (token: string) => {
    const meta = await discover();
    const { payload } = await jwtVerify(token, await keySet(), {
      issuer: meta.issuer,
      audience: config.clientId,
      algorithms: ['RS256'],
    });
    return payload;
  };

  const tokenRequest = async (body: Record<string, string>): Promise<TokenSet> => {
    const meta = await discover();
    const res = await fetch(meta.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      // client_secret_post. secret 은 서버 env 에만 있다
      body: new URLSearchParams({
        ...body,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`OIDC 토큰 요청 실패: ${res.status}`);
    const tokens = tokenResponseSchema.parse(await res.json());
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
  };

  return {
    async authorizeUrl({ state, nonce, codeChallenge, redirectUri }) {
      const meta = await discover();
      const url = new URL(meta.authorization_endpoint);
      url.search = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      }).toString();
      return url.toString();
    },

    exchangeCode: (code, codeVerifier, redirectUri) =>
      tokenRequest({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),

    refresh: (refreshToken) =>
      tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken }),

    async verifyIdToken(idToken, nonce): Promise<IdTokenClaims> {
      const payload = await verify(idToken);
      if (payload.nonce !== nonce) throw new Error('ID 토큰 nonce 불일치');
      if (!payload.sub) throw new Error('ID 토큰에 sub 가 없다');
      return {
        sub: payload.sub,
        sid: optionalString(payload.sid),
        name: optionalString(payload.name) ?? optionalString(payload.given_name),
        email: optionalString(payload.email),
        roles: realmRolesOf(payload),
      };
    },

    async endSessionUrl(idTokenHint, postLogoutRedirectUri) {
      const meta = await discover();
      if (!meta.end_session_endpoint) return null;
      const url = new URL(meta.end_session_endpoint);
      url.search = new URLSearchParams({
        id_token_hint: idTokenHint,
        post_logout_redirect_uri: postLogoutRedirectUri,
        client_id: config.clientId,
      }).toString();
      return url.toString();
    },

    async verifyLogoutToken(logoutToken): Promise<LogoutClaims> {
      const payload = await verify(logoutToken);
      const events = payload.events;
      const hasEvent =
        typeof events === 'object' && events !== null && Reflect.has(events, BACKCHANNEL_EVENT);
      // 스펙(OpenID Back-Channel Logout 2.6): events 필수, nonce 금지, sub 나 sid 중 하나
      if (!hasEvent) throw new Error('로그아웃 토큰에 backchannel-logout 이벤트가 없다');
      if ('nonce' in payload) throw new Error('로그아웃 토큰에 nonce 가 있다');
      const sub = payload.sub;
      const sid = optionalString(payload.sid);
      if (!sub && !sid) throw new Error('로그아웃 토큰에 sub 와 sid 가 없다');
      return { sub, sid };
    },
  };
};
