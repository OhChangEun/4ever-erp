import { NextResponse, type NextRequest } from 'next/server';
import { authProvider, getIdp } from '@/server/auth/config';
import { endSessionsMatching } from '@/server/auth/session';

/**
 * 백채널 로그아웃(OpenID Back-Channel Logout 1.0). IdP 가 서버끼리 logout_token 을 POST 한다.
 * 브라우저가 부르지 않아 같은 출처 검사를 하지 않는다. 대신 IdP 의 서명(JWKS)으로 진짜인지 본다.
 * IdP 에서 세션을 끊으면 이 앱의 같은 사용자 세션도 지워져 다음 요청이 401 이 된다.
 */
export async function POST(req: NextRequest) {
  if (authProvider() !== 'oidc') return new NextResponse(null, { status: 404 });

  const form = await req.formData().catch(() => null);
  const logoutToken = form?.get('logout_token');
  if (typeof logoutToken !== 'string') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  try {
    const { sub, sid } = await getIdp().verifyLogoutToken(logoutToken);
    await endSessionsMatching({ sub, idpSid: sid });
    // 스펙: 성공은 200, 캐시 금지
    return new NextResponse(null, { status: 200, headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}
