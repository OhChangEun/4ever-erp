import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { MM, SD, IM, FCM, HRM, PP } from '@/lib/role';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

const ACCESS_RULES = [
  {
    path: '/dashboard',
    roles: [
      'ALL_ADMIN',
      ...MM,
      ...HRM,
      ...FCM,
      ...IM,
      ...PP,
      ...SD,
      'SUPPLIER_ADMIN',
      'CUSTOMER_ADMIN',
    ],
  },
  { path: '/purchase', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'SUPPLIER_ADMIN'] },
  { path: '/sales', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'CUSTOMER_ADMIN'] },
  { path: '/inventory', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] },
  { path: '/finance', roles: ['ALL_ADMIN', ...FCM, 'SUPPLIER_ADMIN', 'CUSTOMER_ADMIN'] },
  { path: '/hrm', roles: ['ALL_ADMIN', ...HRM] },
  { path: '/production', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] },
];

// 접근 제어는 서버가 한다.
// 브라우저가 쓸 수 있는 role 쿠키 대신, 서버가 서명한 세션 쿠키(httpOnly)를 검증해서 role을 꺼낸다.
export async function middleware(req: NextRequest) {
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

  // 2. 경로별 role 검사 - 세션 안의 role만 믿는다
  const role = session.role.trim().toUpperCase();
  const rule = ACCESS_RULES.find((r) => pathname.startsWith(r.path));
  if (rule && !rule.roles.includes(role)) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/purchase/:path*',
    '/sales/:path*',
    '/inventory/:path*',
    '/finance/:path*',
    '/hrm/:path*',
    '/production/:path*',
  ],
};
