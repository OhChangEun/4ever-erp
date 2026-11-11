// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { server } from '@/test/msw-server';
import { signSession } from '@/lib/auth/session';
import { SESSION_COOKIE } from '@/server/auth/session';
import type { Role } from '@/lib/authz/policy';
import { GET, PATCH, POST } from './route';

const APP = 'http://localhost:3100';

const call = async (
  handler: typeof GET,
  path: string[],
  options: { role?: Role; method?: string; headers?: Record<string, string> } = {},
) => {
  const headers: Record<string, string> = { ...options.headers };
  if (options.role) {
    headers.cookie = `${SESSION_COOKIE}=${await signSession({ sub: 'u1', role: options.role })}`;
  }
  const req = new NextRequest(`${APP}/api/proxy/${path.join('/')}`, {
    method: options.method ?? 'GET',
    headers,
  });
  return handler(req, { params: Promise.resolve({ path }) });
};

/** 업스트림(서버 목 자리)이 받은 요청을 기록한다 */
const recordUpstream = () => {
  const seen: Request[] = [];
  server.use(
    http.all(`${APP}/api/*`, ({ request }) => {
      seen.push(request.clone());
      return HttpResponse.json({ status: 200, success: true, message: 'OK', data: [] });
    }),
  );
  return seen;
};

describe('BFF 프록시 보안 점검(BFF 문서 Phase 5)', () => {
  it('세션이 없으면 업스트림에 가지 않고 401', async () => {
    const seen = recordUpstream();
    expect((await call(GET, ['scm-pp', 'iv', 'warehouses'])).status).toBe(401);
    expect(seen).toHaveLength(0);
  });

  it('업스트림에는 쿠키 대신 Bearer 와 역할 헤더만 간다', async () => {
    const seen = recordUpstream();
    const res = await call(GET, ['scm-pp', 'iv', 'warehouses'], { role: 'IM_ADMIN' });
    expect(res.status).toBe(200);
    expect(seen[0].headers.get('cookie')).toBeNull();
    expect(seen[0].headers.get('authorization')).toMatch(/^Bearer ey/);
    expect(seen[0].headers.get('x-session-role')).toBe('IM_ADMIN');
  });

  it('역할 표에 없는 역할은 403(재무 관리자의 인사 API)', async () => {
    recordUpstream();
    expect((await call(GET, ['business', 'hrm', 'employee'], { role: 'FCM_ADMIN' })).status).toBe(
      403,
    );
  });

  it('".." 로 경로를 바꿔도 정규화한 경로로 인가한다', async () => {
    recordUpstream();
    const res = await call(GET, ['dashboard', '..', 'business', 'hrm', 'employee'], {
      role: 'FCM_ADMIN',
    });
    expect(res.status).toBe(403);
  });

  it('인코딩한 경로(%2f, 이중 인코딩)는 400', async () => {
    recordUpstream();
    expect(
      (await call(GET, ['dashboard%2f..%2fbusiness%2fhrm', 'employee'], { role: 'FCM_ADMIN' }))
        .status,
    ).toBe(400);
    expect(
      (await call(GET, ['%2562usiness', 'hrm', 'employee'], { role: 'FCM_ADMIN' })).status,
    ).toBe(400);
  });

  it('다른 출처에서 온 상태 변경 요청은 세션이 있어도 403', async () => {
    const seen = recordUpstream();
    const res = await call(POST, ['scm-pp', 'iv', 'warehouses'], {
      role: 'ALL_ADMIN',
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site' },
    });
    expect(res.status).toBe(403);
    expect(seen).toHaveLength(0);
  });
});

describe('요청 ID(옵저버빌리티 1)', () => {
  const ID = /^[A-Za-z0-9-]{8,64}$/;

  it('응답과 업스트림 요청에 같은 x-request-id 를 싣는다', async () => {
    const seen = recordUpstream();
    const res = await call(GET, ['scm-pp', 'iv', 'warehouses'], { role: 'IM_ADMIN' });
    const id = res.headers.get('x-request-id') ?? '';
    expect(id).toMatch(ID);
    expect(seen[0]?.headers.get('x-request-id')).toBe(id);
  });

  it('들어온 올바른 요청 ID 는 그대로 쓰고, 이상한 값은 새로 만든다', async () => {
    recordUpstream();
    const kept = await call(GET, ['scm-pp', 'iv', 'warehouses'], {
      role: 'IM_ADMIN',
      headers: { 'x-request-id': 'abc12345-from-client' },
    });
    expect(kept.headers.get('x-request-id')).toBe('abc12345-from-client');
    const replaced = await call(GET, ['scm-pp', 'iv', 'warehouses'], {
      role: 'IM_ADMIN',
      headers: { 'x-request-id': 'bad id <script>' },
    });
    expect(replaced.headers.get('x-request-id')).toMatch(ID);
    expect(replaced.headers.get('x-request-id')).not.toBe('bad id <script>');
  });

  it('프록시가 직접 만든 응답(401)에도 요청 ID 가 있다', async () => {
    const res = await call(GET, ['scm-pp', 'iv', 'warehouses']);
    expect(res.status).toBe(401);
    expect(res.headers.get('x-request-id')).toMatch(ID);
  });

  it('업스트림 연결 실패는 502 와 실패 본문, 요청 ID', async () => {
    server.use(http.all(`${APP}/api/*`, () => HttpResponse.error()));
    const res = await call(GET, ['scm-pp', 'iv', 'warehouses'], { role: 'IM_ADMIN' });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ status: 502, success: false });
    expect(res.headers.get('x-request-id')).toMatch(ID);
  });
});

// 게이트웨이 PATCH /scm-pp/pp/boms/{bomId} 는 BomCreateRequestDto 를 받아 {statusCode, version} 을 버린다.
// 실백엔드로 가면 빈 수정이 BOM 을 덮을 수 있어 프록시가 요청마다 막는다(카드 BOM 상태 변경 요청)
describe('BOM 상태 PATCH 차단', () => {
  const BACKEND = 'http://backend.test/api';
  const BOM = ['scm-pp', 'pp', 'boms', 'bom-001'];

  /** 실백엔드 자리. 받은 요청을 기록한다 */
  const recordBackend = () => {
    const seen: Request[] = [];
    server.use(
      http.all(`${BACKEND}/*`, ({ request }) => {
        seen.push(request.clone());
        return HttpResponse.json({ status: 200, success: true, message: 'OK', data: {} });
      }),
    );
    return seen;
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('실백엔드가 붙으면 BOM PATCH 는 업스트림에 가지 않고 501', async () => {
    vi.stubEnv('BACKEND_API_URL', BACKEND);
    const seen = recordBackend();
    const res = await call(PATCH, BOM, { role: 'PP_ADMIN', method: 'PATCH' });
    expect(res.status).toBe(501);
    expect(await res.json()).toMatchObject({ status: 501, success: false });
    expect(seen).toHaveLength(0);
  });

  it('실백엔드여도 BOM 상세 GET 과 다른 BOM 경로 PATCH 는 그대로 간다', async () => {
    vi.stubEnv('BACKEND_API_URL', BACKEND);
    const seen = recordBackend();
    expect((await call(GET, BOM, { role: 'PP_ADMIN' })).status).toBe(200);
    expect(
      (await call(PATCH, [...BOM, 'items'], { role: 'PP_ADMIN', method: 'PATCH' })).status,
    ).toBe(200);
    expect(seen.map((r) => `${r.method} ${new URL(r.url).pathname}`)).toEqual([
      'GET /api/scm-pp/pp/boms/bom-001',
      'PATCH /api/scm-pp/pp/boms/bom-001/items',
    ]);
  });

  it('서버 목(실백엔드 없음)이면 BOM PATCH 는 지금처럼 통과', async () => {
    vi.stubEnv('BACKEND_API_URL', '');
    const seen = recordUpstream();
    const res = await call(PATCH, BOM, { role: 'PP_ADMIN', method: 'PATCH' });
    expect(res.status).toBe(200);
    expect(seen).toHaveLength(1);
  });
});
