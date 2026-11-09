import 'server-only';
import { createOidcIdp } from './idp/oidc';
import type { IdentityProvider } from './idp/types';

/**
 * 인증 방식. demo 는 Vercel 시연용 데모 계정(결정 11), oidc 는 실제 IdP(로컬 Keycloak, 결정 10).
 * 서버 env AUTH_PROVIDER 하나로 고른다. 화면(로그인 버튼)은 NEXT_PUBLIC_AUTH_PROVIDER 를 같이 맞춘다.
 */
export type AuthProvider = 'demo' | 'oidc';

export const authProvider = (): AuthProvider =>
  process.env.AUTH_PROVIDER === 'oidc' ? 'oidc' : 'demo';

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (AUTH_PROVIDER=oidc)`);
  return value;
};

let idp: IdentityProvider | null = null;

/** OIDC IdP. env 를 쓰는 시점에 읽는다(빌드 머신에 env 가 없어도 빌드는 통과) */
export const getIdp = (): IdentityProvider => {
  idp ??= createOidcIdp({
    issuer: requiredEnv('OIDC_ISSUER'),
    clientId: requiredEnv('OIDC_CLIENT_ID'),
    clientSecret: requiredEnv('OIDC_CLIENT_SECRET'),
  });
  return idp;
};
