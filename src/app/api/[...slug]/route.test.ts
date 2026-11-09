import { describe, expect, it } from 'vitest';
import { HttpHandler, getResponse } from 'msw';
import { NextRequest } from 'next/server';
import { handlers } from '@/mocks/handlers';
import { GET, POST } from './route';

/**
 * 서버 목(`/api/[...slug]`)은 MSW 핸들러를 그대로 쓴다(목 한 벌 카드).
 * Vercel 데모와 e2e 가 보는 목과 단위 테스트가 보는 목이 같아야 테스트가 거짓으로 통과하지 않는다.
 */
const origin = location.origin;

const callRoute = (
  method: 'GET' | 'POST',
  path: string,
  init?: { body?: string; headers?: Record<string, string> },
) => {
  const request = new NextRequest(`${origin}/api/${path}`, { method, ...init });
  const context = { params: Promise.resolve({ slug: path.split('/') }) };
  return method === 'GET' ? GET(request, context) : POST(request, context);
};

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
      const expected = await getResponse(handlers, new Request(`${origin}${path}`));
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
