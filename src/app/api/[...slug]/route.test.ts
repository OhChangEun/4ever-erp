// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { HttpHandler, getResponse } from 'msw';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { handlers } from '@/mocks/handlers';
import { signSession } from '@/lib/auth/session';
import { MOCK_PROOF_HEADER, signMockProof } from '@/server/auth/mockProof';
import { withMockProof } from '@/test/mockProof';
import { GET, POST } from './route';

/**
 * 서버 목(`/api/[...slug]`)은 MSW 핸들러를 그대로 쓴다(목 한 벌 카드).
 * Vercel 데모와 e2e 가 보는 목과 단위 테스트가 보는 목이 같아야 테스트가 거짓으로 통과하지 않는다.
 */
const origin = 'http://localhost:3100';

/** 증명 없이 그대로 부른다(브라우저가 `/api/<경로>` 를 직접 부른 것과 같다) */
const callDirect = (
  method: 'GET' | 'POST',
  path: string,
  init?: { body?: string; headers?: HeadersInit },
) => {
  const request = new NextRequest(`${origin}/api/${path}`, { method, ...init });
  const context = { params: Promise.resolve({ slug: path.split('/') }) };
  return method === 'GET' ? GET(request, context) : POST(request, context);
};

/** 프록시가 넘긴 호출처럼 내부 호출 증명을 붙여 부른다 */
const callRoute = async (
  method: 'GET' | 'POST',
  path: string,
  init?: { body?: string; headers?: Record<string, string> },
) => callDirect(method, path, { ...init, headers: await withMockProof(init?.headers) });

// 시각 값은 호출마다 다를 수 있어 비교에서 뺀다
const normalize = (value: unknown) =>
  JSON.stringify(value, (_key, v: unknown) =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? 'ISO' : v,
  );

const literalGetPaths = handlers
  .filter((h): h is HttpHandler => h instanceof HttpHandler)
  .filter((h) => h.info.method === 'GET')
  .map((h) => h.info.path)
  .filter((p): p is string => typeof p === 'string' && !p.includes(':') && !p.includes('*'))
  .filter((p) => p.startsWith('/api/proxy/') && !p.endsWith('/subscribe'));

describe('서버 목 = MSW 핸들러', () => {
  it('구체 GET 경로마다 MSW 와 같은 본문을 준다', async () => {
    expect(literalGetPaths.length).toBeGreaterThan(50);
    const different: string[] = [];
    for (const path of literalGetPaths) {
      const slug = path.replace(/^\/api\/proxy\//, '');
      // node 환경엔 location 이 없어 상대 경로 핸들러의 기준 주소를 넘긴다
      const expected = await getResponse(handlers, new Request(`${origin}${path}`), {
        baseUrl: origin,
      });
      const actual = await callRoute('GET', slug);
      const [a, b] = await Promise.all([actual.json(), expected?.json()]);
      if (normalize(a) !== normalize(b)) different.push(slug);
    }
    expect(different).toEqual([]);
  });

  it('쓰기 요청도 MSW 핸들러로 간다(창고 등록)', async () => {
    const res = await callRoute('POST', 'scm-pp/iv/warehouses', {
      body: JSON.stringify({ warehouseName: '새 창고' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(200);
  });

  it('실패 시나리오 헤더가 서버 목에서도 먹는다', async () => {
    const res = await callRoute('GET', 'scm-pp/iv/warehouses', {
      headers: { 'x-mock-scenario': '500' },
    });
    expect(res.status).toBe(500);
  });

  // 리뷰 P2: 프록시 밖 주소로 등록된 핸들러(USER_ENDPOINTS)도 예전처럼 받는다
  it('/api/me 처럼 원래 주소로 등록된 핸들러도 받는다', async () => {
    const res = await callRoute('GET', 'me');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, data: { name: '홍길동' } });
  });

  it('모르는 경로는 404 와 success false', async () => {
    const res = await callRoute('GET', 'nope/unknown');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ status: 404, success: false });
  });
});

/**
 * 남은 표시 결함 3 리뷰 P2(보안). 서버 목은 세션 검증도 인가 표도 없는 자리라 프록시가 넘긴 호출만 받는다.
 * 프록시는 SESSION_SECRET 으로 서명한 증명(`x-mock-proof`)을 붙이고, 역할은 헤더가 아니라 증명에서 읽는다.
 */
describe('서버 목은 프록시가 넘긴 호출만 받는다', () => {
  const WORKFLOWS = 'dashboard/workflows';
  const tabCodes = async (res: Response) => {
    const body: { data: { tabs: { tabCode: string }[] } } = await res.json();
    return body.data.tabs.map((tab) => tab.tabCode);
  };

  it('증명 없이 직접 부르면 401 이고 목 데이터를 주지 않는다', async () => {
    const res = await callDirect('GET', 'business/hrm/employee');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ status: 401, success: false, message: expect.any(String) });
  });

  it('역할 헤더만 지어내서는 401', async () => {
    const res = await callDirect('GET', WORKFLOWS, { headers: { 'x-session-role': 'HRM_ADMIN' } });
    expect(res.status).toBe(401);
  });

  it('쓰기 요청도 증명이 없으면 401', async () => {
    const res = await callDirect('POST', 'scm-pp/iv/warehouses', {
      body: JSON.stringify({ warehouseName: '새 창고' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it.each([
    ['아무 글자', () => Promise.resolve('not-a-token')],
    [
      '다른 비밀키로 서명한 증명',
      () =>
        new SignJWT({ use: 'server-mock', role: 'ALL_ADMIN', rid: 'r' })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('30s')
          .sign(new TextEncoder().encode('another-secret-32-bytes-long-for-forgery')),
    ],
    // 같은 비밀키로 서명했지만 용도가 다르다. 로그인한 사용자가 자기 세션 값을 증명으로 내밀어 인가 표를 건너뛰지 못한다
    ['세션 JWT', () => signSession({ sub: 'u1', role: 'ALL_ADMIN' })],
    [
      '만료된 증명',
      () =>
        new SignJWT({ use: 'server-mock', role: 'ALL_ADMIN', rid: 'r' })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
          .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
          .sign(new TextEncoder().encode(process.env.SESSION_SECRET)),
    ],
    // 같은 비밀키, 맞는 용도인데 만료가 없다. 한 번 새면 영원히 쓸 수 있어 받지 않는다(2차 리뷰)
    [
      '만료가 없는 증명',
      () =>
        new SignJWT({ use: 'server-mock', role: 'ALL_ADMIN', rid: 'r' })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .sign(new TextEncoder().encode(process.env.SESSION_SECRET)),
    ],
    [
      '같은 비밀키의 HS512 증명',
      () =>
        new SignJWT({ use: 'server-mock', role: 'ALL_ADMIN', rid: 'r' })
          .setProtectedHeader({ alg: 'HS512' })
          .setIssuedAt()
          .setExpirationTime('30s')
          .sign(new TextEncoder().encode(process.env.SESSION_SECRET?.padEnd(64, 'x'))),
    ],
    [
      '서명 없는 alg none 증명',
      () => {
        const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
        const exp = Math.floor(Date.now() / 1000) + 30;
        return Promise.resolve(
          `${part({ alg: 'none', typ: 'JWT' })}.${part({ use: 'server-mock', role: 'ALL_ADMIN', rid: 'r', exp })}.`,
        );
      },
    ],
  ])('위조한 증명(%s)은 401', async (_, forge) => {
    const res = await callDirect('GET', WORKFLOWS, {
      headers: { [MOCK_PROOF_HEADER]: await forge(), 'x-session-role': 'ALL_ADMIN' },
    });
    expect(res.status).toBe(401);
  });

  it('증명이 맞으면 200 이고, 역할은 헤더가 아니라 증명에서 읽는다', async () => {
    const res = await callDirect('GET', WORKFLOWS, {
      headers: {
        [MOCK_PROOF_HEADER]: await signMockProof('IM_ADMIN', 'request-1'),
        'x-session-role': 'HRM_ADMIN', // 지어낸 값. 증명의 IM_ADMIN 으로 덮인다
      },
    });
    expect(res.status).toBe(200);
    expect(await tabCodes(res)).toEqual(['IN', 'OUT']);
  });
});
