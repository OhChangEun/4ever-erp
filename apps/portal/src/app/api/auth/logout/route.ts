import { NextResponse, type NextRequest } from 'next/server';
import { endSession, getIdp } from '@portal/server/auth';

/**
 * 포털 로그아웃. 포털 세션을 지우고 Keycloak 로그아웃 주소를 돌려준다(RP 시작 로그아웃).
 * 브라우저가 그 주소로 가면 Keycloak 세션이 끝나고, Keycloak 이 erp 에 백채널로 알려 erp 세션도 끝난다.
 */
export async function POST(req: NextRequest) {
  // 다른 출처의 폼이 로그아웃시키지 못하게
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) {
    return NextResponse.json({ message: '잘못된 요청 출처' }, { status: 403 });
  }
  const res = NextResponse.json({ message: 'OK' });
  const ended = await endSession(res, req.cookies);
  const idToken = ended?.tokens?.idToken;
  if (!idToken) return res;
  const redirectTo = await getIdp()
    .endSessionUrl(idToken, new URL('/signed-out', req.url).toString())
    .catch(() => null);
  if (!redirectTo) return res;
  const withRedirect = NextResponse.json({ message: 'OK', redirectTo });
  for (const cookie of res.cookies.getAll()) withRedirect.cookies.set(cookie);
  return withRedirect;
}
