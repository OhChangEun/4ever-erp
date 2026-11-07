import { SESSION_COOKIE, signSession } from '@/lib/auth/session';
import { buildMockUser, DEMO_ACCOUNTS } from '@/lib/auth/simpleLogin';
import { isSameOriginRequest } from '@/lib/auth/sameOrigin';
import { NextRequest, NextResponse } from 'next/server';

interface LoginBody {
  loginId: string;
}

function isLoginBody(value: unknown): value is LoginBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'loginId' in value &&
    typeof value.loginId === 'string'
  );
}

export async function POST(req: NextRequest) {
  // 0. CSRF 방어 - 다른 출처에서 온 로그인 요청 차단 (lax가 못 막는 같은 site 출처 포함)
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ message: '잘못된 요청 출처' }, { status: 403 });
  }

  // 1. body 읽기 — { loginId: string } 형태
  const body: unknown = await req.json();

  // 2.0 null이거나 { loginId: string } 형태가 아니라면 400 반환
  if (!isLoginBody(body)) {
    return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });
  }

  // 2.1 계정이 존재하는지 체크
  const loginId = body.loginId.trim().toLowerCase();
  const isExists = DEMO_ACCOUNTS.some((a) => a.loginId === loginId);
  if (!isExists) {
    return NextResponse.json({ message: '없는 아이디입니다.' }, { status: 401 });
  }

  // 3. buildMockUser(loginId)로 user 생성
  const user = buildMockUser(loginId);

  // 4. NextResponse.json({ user }) 만들고
  const res = NextResponse.json({ user });

  // 5. res.cookies.set({ ... }) 로 세션 쿠키 심기
  const value = await signSession({ sub: loginId, role: user.role });
  res.cookies.set({
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  // 6. res 반환
  return res;
}
