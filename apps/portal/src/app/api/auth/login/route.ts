import type { NextRequest } from 'next/server';
import { loginFlow } from '@portal/server/auth';

/** 로그인 시작: Keycloak 으로 302. 같은 realm 에 erp 로 로그인해 있으면 Keycloak 이 폼 없이 바로 돌려보낸다(SSO) */
export const GET = (req: NextRequest) => loginFlow.start(req);
