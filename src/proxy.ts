import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccessPage } from '@/lib/authz/policy';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

// 접근 제어는 서버가 한다.
// 브라우저가 쓸 수 있는 role 쿠키 대신, 서버가 서명한 세션 쿠키(httpOnly)를 검증해서 role을 꺼낸다.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. 세션 쿠키 검증 - 없거나 서명이 틀리면 로그인으로
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('returnTo', pathname);
    const res = NextResponse.redirect(loginUrl);
    // 깨진 쿠키는 여기서 지운다 - 다음 요청부터 다시 검증하지 않게
    if (token) res.cookies.delete({ name: SESSION_COOKIE, path: '/' });
    return res;
  }

  // 2. 경로별 role 검사 - 세션 안의 role만 믿는다. 규칙 표는 src/lib/authz/policy.ts 하나
  if (!canAccessPage(session.role, pathname)) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
}

export const config = {
  // allowlist(열거) 대신 공개 경로만 제외하는 denylist.
  // 새 비공개 라우트가 생겨도 자동으로 인증이 걸린다(예전엔 alarm·low-stock·warehouse가 matcher 밖이라 무인증이었다).
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|unauthorized|callback|profile|.*\\..*).*)',
  ],
};
