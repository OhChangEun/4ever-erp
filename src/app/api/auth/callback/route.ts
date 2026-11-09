import type { NextRequest } from 'next/server';
import { finishOidcLogin } from '@/server/auth/oidcLogin';

// OIDC 콜백. IdP 가 code 와 state 를 붙여 돌려보낸다. 처리는 src/server/auth/oidcLogin.ts
export function GET(req: NextRequest) {
  return finishOidcLogin(req);
}
