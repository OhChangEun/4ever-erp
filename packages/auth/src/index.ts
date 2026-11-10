/**
 * @everp/auth: BFF 인증 공통 모듈(SSO 포털 카드, 계획 8절과 16-1 "BFF 모듈을 공유 패키지로").
 * 프레임워크에 묶이지 않은 것만 여기에. Next 에 묶인 로그인 흐름은 '@everp/auth/next'.
 * 서버 전용이다. 쓰는 쪽의 진입 파일(설정, 세션)이 'server-only' 를 import 한다.
 */
export { createOidcIdp } from './idp/oidc';
export type { IdentityProvider, IdTokenClaims, LogoutClaims, TokenSet } from './idp/types';
export { createCodeChallenge, generateRandomBase64Url } from './pkce';
export { createMemorySessionStore } from './session/memoryStore';
export { ensureFreshSession, REFRESH_LEEWAY_MS } from './session/refresh';
export type { SessionData, SessionStore, StoredSession } from './session/store';
export { createShortLivedSigner, type ShortLivedSigner } from './shortLived';
