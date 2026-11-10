import 'server-only';
import { createOidcLoginFlow } from '@everp/auth/next';
import { ROLES, type Role } from '@/lib/authz/policy';
import { shortLivedSigner } from '@/lib/auth/session';
import { safeReturnTo } from '@/lib/auth/returnTo';
import { getIdp } from './config';
import { startSession } from './session';

/**
 * OIDC Authorization Code + PKCE 로그인(인증 4단계 카드, BFF 문서 Phase 3-1, 3-2).
 * 흐름(state, nonce, PKCE, 트랜잭션 쿠키, 콜백 검사)은 @everp/auth/next 가 한다(SSO 포털 카드에서 옮김).
 * erp 에 남는 것은 역할 고르기와 세션 심기, returnTo 검사.
 */

/** 토큰의 역할 중 역할 표에 있는 첫 번째(표 순서, ALL_ADMIN 이 먼저). 없으면 null */
export const pickRole = (roles: readonly string[]): Role | null =>
  ROLES.find((role) => roles.includes(role)) ?? null;

const flow = createOidcLoginFlow<Role>({
  getIdp,
  signer: shortLivedSigner,
  pickRole,
  startSession,
  safeReturnTo,
});

export const startOidcLogin = flow.start;
export const finishOidcLogin = flow.finish;
