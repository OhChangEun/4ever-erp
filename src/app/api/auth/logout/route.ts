import { endSession } from '@/server/auth/session';
import { authProvider, getIdp } from '@/server/auth/config';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // 1. 앱 세션을 끝낸다. 쿠키 삭제는 응답 헤더(Set-Cookie)에 실려서 응답을 먼저 만든다
  const res = NextResponse.json({ message: 'OK' });
  const ended = await endSession(res, req.cookies);

  // 2. OIDC 세션이면 IdP 세션도 끝내야 SSO 로 다시 바로 들어오지 않는다(RP 시작 로그아웃).
  //    브라우저가 이동할 IdP 로그아웃 주소를 같이 돌려준다
  const idToken = ended?.tokens?.idToken;
  if (authProvider() === 'oidc' && idToken) {
    const redirectTo = await getIdp()
      .endSessionUrl(idToken, new URL('/login', req.url).toString())
      .catch(() => null);
    if (redirectTo) {
      const withRedirect = NextResponse.json({ message: 'OK', redirectTo });
      for (const cookie of res.cookies.getAll()) withRedirect.cookies.set(cookie);
      return withRedirect;
    }
  }
  return res;
}
