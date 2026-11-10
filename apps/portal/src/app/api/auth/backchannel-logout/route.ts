import { NextResponse, type NextRequest } from 'next/server';
import { getIdp, sessionStore } from '@portal/server/auth';

/**
 * 백채널 로그아웃(OpenID Back-Channel Logout 1.0). erp 에서 로그아웃하거나 관리자가 세션을 끊으면
 * Keycloak 이 서버끼리 서명한 logout_token 을 보낸다. 그 사용자의 포털 세션을 지운다.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const logoutToken = form?.get('logout_token');
  if (typeof logoutToken !== 'string') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  try {
    const { sub, sid } = await getIdp().verifyLogoutToken(logoutToken);
    await sessionStore.deleteMatching({ sub, idpSid: sid });
    return new NextResponse(null, { status: 200, headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}
