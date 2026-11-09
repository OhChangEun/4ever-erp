import { getResponse } from 'msw';
import { NextResponse, type NextRequest } from 'next/server';
import { handlers } from '@/mocks/handlers';
import { API_BASE_URL } from '@/app/types/api';

/**
 * 서버 목. `BACKEND_API_URL` 이 없으면 프록시(`/api/proxy/*`)가 여기로 넘긴다(Vercel 데모, e2e).
 * 응답은 단위 테스트와 같은 MSW 핸들러(`src/mocks/handlers`)가 만든다(목 한 벌 카드).
 * 예전엔 if 문 160개(1,902줄)를 따로 손으로 써서 GET 103개 중 8개가 MSW 와 달랐다.
 * 실패 시나리오(`x-mock-scenario` 헤더, `?mockScenario=`)도 같은 핸들러가 받는다.
 */
async function handler(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join('/');
  const { origin, search } = request.nextUrl;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const respond = (url: URL) =>
    getResponse(
      handlers,
      new Request(url, { method: request.method, headers: request.headers, body }),
      { baseUrl: origin },
    );

  // 대부분의 핸들러는 화면이 부르는 프록시 주소(`${API_BASE_URL}/...`)로 등록돼 있다.
  // `/api/me` 처럼 이 주소 그대로 등록된 것(USER_ENDPOINTS)이 있어 원래 주소를 먼저 본다(리뷰 P2)
  const response =
    (await respond(new URL(`/api/${path}${search}`, origin))) ??
    (await respond(new URL(`${API_BASE_URL}/${path}${search}`, origin)));

  if (!response) {
    return NextResponse.json(
      { status: 404, success: false, message: `Not Found: ${path}` },
      { status: 404 },
    );
  }
  // network 시나리오(HttpResponse.error)는 서버에서 연결을 끊을 수 없다. 502 로 알린다
  if (response.type === 'error') {
    return NextResponse.json(
      { status: 502, success: false, message: 'Mock network error' },
      { status: 502 },
    );
  }
  return response;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
