import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';

// BFF 프록시 - 브라우저는 세션 쿠키만 보내고, 백엔드가 요구하는 Bearer 토큰은 서버에서 붙인다.
// 브라우저 어디에도 액세스 토큰이 남지 않는다.
//
// 업스트림: BACKEND_API_URL (서버 전용 env, NEXT_PUBLIC 아님).
// 없으면 이 앱의 목 API 레이어(/api/[...slug])로 넘긴다.

type RouteContext = { params: Promise<{ path: string[] }> };

// 업스트림으로 넘기지 않는 요청 헤더 - 쿠키는 세션 유출 방지, 나머지는 fetch가 다시 계산한다
const DROP_REQUEST_HEADERS = ['cookie', 'host', 'content-length', 'connection'];

// 업스트림 응답에서 그대로 돌려줄 헤더 - 인코딩·전송 관련 헤더는 Node fetch가 이미 풀어놓았으므로 제외
const KEEP_RESPONSE_HEADERS = ['content-type', 'cache-control'];

function resolveUpstreamBase(req: NextRequest): string {
  const configured = process.env.BACKEND_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  return new URL('/api', req.url).toString().replace(/\/$/, '');
}

async function handle(req: NextRequest, ctx: RouteContext) {
  // 1. 세션 쿠키 검증 - 없거나 깨졌으면 업스트림에 가지도 않는다
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!token || !session) {
    return NextResponse.json(
      { status: 401, success: false, message: '로그인이 필요합니다.' },
      { status: 401 },
    );
  }

  // 2. 대상 URL 조립 - 경로와 쿼리스트링을 그대로 잇는다
  const { path } = await ctx.params;
  const target = new URL(`${resolveUpstreamBase(req)}/${path.join('/')}`);
  target.search = req.nextUrl.search;

  // 3. 헤더 교환 - 쿠키를 떼고 Authorization: Bearer 를 붙인다
  const headers = new Headers(req.headers);
  for (const name of DROP_REQUEST_HEADERS) headers.delete(name);
  headers.set('authorization', `Bearer ${token}`);
  headers.set('x-session-role', session.role);

  // 4. 업스트림 호출 - body는 GET/HEAD 외에만 전달
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  // 5. 응답 그대로 되돌리기 - 상태 코드와 필요한 헤더만
  const resHeaders = new Headers();
  for (const name of KEEP_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) resHeaders.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers: resHeaders });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
