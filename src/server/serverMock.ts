import 'server-only';
import { createHash } from 'node:crypto';
import { getResponse } from 'msw';
import { NextResponse, type NextRequest } from 'next/server';
import { handlers } from '@/mocks/handlers';
import { API_BASE_URL } from '@/app/types/api';

/**
 * 서버 목 어댑터. 요청을 단위 테스트와 같은 MSW 핸들러(`src/mocks/handlers`)에 넘겨 응답을 만든다(목 한 벌 카드).
 * 예전엔 if 문 160개(1,902줄)를 따로 손으로 써서 GET 103개 중 8개가 MSW 와 달랐다.
 * 실패 시나리오(`x-mock-scenario` 헤더, `?mockScenario=`)도 같은 핸들러가 받는다.
 * 여기는 누가 불렀는지 보지 않는다. 라우트(`src/app/api/[...slug]/route.ts`)가 프록시 증명을 확인하고
 * 역할 헤더를 증명의 역할로 바꾼 headers 를 넘긴다. 라우트 말고는 테스트만 직접 부른다.
 */
/**
 * 목 상태 저장소(`src/mocks/state.ts`)와 알림 목이 `Authorization` 을 로그인별 키로 쓴다. 핸들러는 이 값을 키로만 쓰고
 * 토큰 내용을 읽지 않는다. 세션 토큰 원문이 저장소 키로 서버 메모리에 남지 않게 SHA-256 해시로 바꿔 넘긴다.
 * 해시는 여기(서버 전용)에서 한다. 저장소 안에서 하면 브라우저 번들에 `node:crypto` 가 딸려 온다
 */
const withHashedAuthorization = (source: Headers): Headers => {
  const authorization = source.get('authorization');
  if (!authorization) return source;
  const headers = new Headers(source);
  headers.set(
    'authorization',
    `sha256:${createHash('sha256').update(authorization).digest('hex')}`,
  );
  return headers;
};

export async function serveMock(
  request: NextRequest,
  slug: string[],
  sourceHeaders: Headers = request.headers,
): Promise<Response> {
  const headers = withHashedAuthorization(sourceHeaders);
  const path = slug.join('/');
  const { origin, search } = request.nextUrl;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const respond = (url: URL) =>
    getResponse(handlers, new Request(url, { method: request.method, headers, body }), {
      baseUrl: origin,
    });

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
