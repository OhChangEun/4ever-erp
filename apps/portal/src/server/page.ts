import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession } from './auth';

/**
 * 화면용 세션. 없으면 로그인 시작으로 보낸다. erp 에 로그인해 있으면 Keycloak 이 폼 없이 돌려보내
 * 사용자는 바로 이 화면을 본다(SSO). 백채널 로그아웃으로 세션이 지워졌으면 여기서 다시 로그인으로 간다.
 */
export const requireSession = async (returnTo: string) => {
  const session = await readSession(await cookies());
  if (!session) redirect(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  return session;
};
