// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { server } from '@/test/msw-server';
import { signSession } from '@/lib/auth/session';
import { SESSION_COOKIE } from '@/server/auth/session';
import type { Role } from '@/lib/authz/policy';
import { GET, POST } from './route';

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
