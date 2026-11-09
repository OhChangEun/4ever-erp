import { startSession } from '@/server/auth/session';
import { authProvider } from '@/server/auth/config';
import { startOidcLogin } from '@/server/auth/oidcLogin';
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

/** OIDC 로그인 시작: IdP 로그인 화면으로 302. 데모 모드면 로그인 화면으로 돌려보낸다 */
export async function GET(req: NextRequest) {
  if (authProvider() !== 'oidc') return NextResponse.redirect(new URL('/login', req.url));
  return startOidcLogin(req);
}

/** 데모 로그인(아이디 선택). OIDC 모드에선 막는다: 비밀번호 없이 역할을 고르는 길이 남으면 안 된다 */
export async function POST(req: NextRequest) {
  if (authProvider() === 'oidc') {
    return NextResponse.json({ message: '데모 로그인이 꺼져 있습니다.' }, { status: 404 });
  }
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

  // 5. 세션 시작 - 쿠키 이름과 옵션(httpOnly, lax, 1일)은 세션 모듈이 정한다
  await startSession(res, { sub: loginId, role: user.role });

  // 6. res 반환
  return res;
}
