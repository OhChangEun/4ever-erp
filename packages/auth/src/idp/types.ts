/** IdP 가 준 토큰 묶음. expiresAt 은 access token 만료 시각(ms) */
export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
}

/** 검증한 ID 토큰에서 앱이 쓰는 값 */
export interface IdTokenClaims {
  sub: string;
  /** IdP 세션 ID. 백채널 로그아웃이 이 값으로 세션을 찾는다 */
  sid?: string;
  name?: string;
  email?: string;
  /** realm_access.roles. 역할 표 밖의 값도 들어 있을 수 있다 */
  roles: string[];
}

/** 검증한 백채널 로그아웃 토큰. sub 와 sid 중 하나 이상 */
export interface LogoutClaims {
  sub?: string;
  sid?: string;
}

/**
 * IdP 경계(계획 8절 1번). 지금 구현은 OIDC 하나다. 데모 로그인은 IdP 없이 세션만 연다.
 * 서버가 생기면 env(OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET)만 바꾼다.
 */
export interface IdentityProvider {
  authorizeUrl(params: {
    state: string;
    nonce: string;
    codeChallenge: string;
    redirectUri: string;
  }): Promise<string>;
  exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<TokenSet>;
  refresh(refreshToken: string): Promise<TokenSet>;
  verifyIdToken(idToken: string, nonce: string): Promise<IdTokenClaims>;
  /** RP 시작 로그아웃 주소. IdP 가 지원하지 않으면 null */
  endSessionUrl(idTokenHint: string, postLogoutRedirectUri: string): Promise<string | null>;
  verifyLogoutToken(logoutToken: string): Promise<LogoutClaims>;
}
