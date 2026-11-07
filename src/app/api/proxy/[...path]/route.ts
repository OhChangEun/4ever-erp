import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { isSameOriginRequest } from '@/lib/auth/sameOrigin';
import { MM, SD, IM, FCM, HRM, PP } from '@/lib/role';
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

// 도메인별 인가 규칙 - 페이지(middleware ACCESS_RULES)와 같은 role 집합을 프록시에서도 강제한다.
// 규칙에 없는 공유 경로(dashboard, business/profile, scm-pp/product, alarm)는 로그인만 되면 통과.
// prefix는 업스트림 경로(/api/proxy 뒤) 기준. 긴 prefix가 먼저 오도록 둔다.
const PROXY_ACCESS_RULES: { prefix: string; roles: string[] }[] = [
  { prefix: 'business/hrm', roles: ['ALL_ADMIN', ...HRM] }, // 인사(내부 전용)
  { prefix: 'business/fcm', roles: ['ALL_ADMIN', ...FCM, 'SUPPLIER_ADMIN', 'CUSTOMER_ADMIN'] }, // 재무
  { prefix: 'business/sd', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'CUSTOMER_ADMIN'] }, // 영업
  { prefix: 'scm-pp/mm', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP, 'SUPPLIER_ADMIN'] }, // 구매(공급사 화면이 이 경로를 쓴다)
  { prefix: 'scm-pp/iv', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] }, // 재고
  { prefix: 'scm-pp/sales-orders', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] }, // 재고 출하(INVENTORY_ENDPOINTS)
  { prefix: 'scm-pp/purchase-orders', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] }, // 재고 입고(INVENTORY_ENDPOINTS)
  { prefix: 'scm-pp/pp', roles: ['ALL_ADMIN', ...MM, ...SD, ...IM, ...PP] }, // 생산
];

// business/hrm 중 "본인 셀프서비스"는 HRM 권한 없이도 허용(프로필 화면의 근태·휴가 신청·본인 정보).
// 관리자용 PII 경로(employee 목록, payroll 등)는 위 규칙대로 HRM 역할만.
const HRM_SELF_SERVICE = new Set([
  'business/hrm/attendance/check-in',
  'business/hrm/attendance/check-out',
  'business/hrm/leave/request',
  'business/hrm/employees/by-internel-user',
]);

function resolveUpstreamBase(req: NextRequest): string {
  const configured = process.env.BACKEND_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  return new URL('/api', req.url).toString().replace(/\/$/, '');
}

async function handle(req: NextRequest, ctx: RouteContext) {
  // 0. 상태 변경(POST/PUT/PATCH/DELETE) 요청은 같은 출처만 허용 - CSRF 방어
  const isStateChanging = req.method !== 'GET' && req.method !== 'HEAD';
  if (isStateChanging && !isSameOriginRequest(req)) {
    return NextResponse.json(
      { status: 403, success: false, message: '잘못된 요청 출처' },
      { status: 403 },
    );
  }

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
  const base = resolveUpstreamBase(req);
  const basePath = new URL(base).pathname.replace(/\/+$/, '');
  const target = new URL(`${base}/${path.join('/')}`);
  target.search = req.nextUrl.search;

  // 2.5 인가 - new URL이 정규화한 경로 기준으로 본다.
  // path를 그대로 join해 검사하면 dashboard%2f..%2fbusiness%2fhrm 같은 traversal이 인가를 우회한다.
  if (target.pathname !== basePath && !target.pathname.startsWith(`${basePath}/`)) {
    // 정규화 결과가 업스트림 base(/api 등)를 벗어남
    return NextResponse.json({ status: 400, success: false, message: '잘못된 경로' }, { status: 400 });
  }
  const upstreamPath = target.pathname.slice(basePath.length).replace(/^\/+/, '');

  // 잔여 퍼센트 인코딩 거부 - new URL은 %62 등을 안 풀지만 업스트림 라우트가 한 번 더 풀어
  // 인가를 우회(%2562usiness → %62usiness → business)할 수 있다. 정상 경로엔 %가 없다.
  if (upstreamPath.includes('%')) {
    return NextResponse.json({ status: 400, success: false, message: '잘못된 경로' }, { status: 400 });
  }

  const role = session.role.trim().toUpperCase();
  const proxyRule = HRM_SELF_SERVICE.has(upstreamPath)
    ? undefined
    : PROXY_ACCESS_RULES.find((r) => upstreamPath.startsWith(r.prefix));
  if (proxyRule && !proxyRule.roles.includes(role)) {
    return NextResponse.json(
      { status: 403, success: false, message: '접근 권한이 없습니다.' },
      { status: 403 },
    );
  }

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
