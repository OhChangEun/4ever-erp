import { http } from 'msw';
import { NextRequest } from 'next/server';
import { server } from '@/test/msw-server';
import { serveMock } from '@/server/serverMock';

export type MockSource = 'msw' | 'server';

/**
 * 계약 테스트의 목 출처를 고른다.
 * - msw: 브라우저 목(`src/mocks/handlers`). 단위 테스트와 `NEXT_PUBLIC_API_MOCKING` 이 쓴다.
 * - server: 서버 목 어댑터(`src/server/serverMock.ts`). Vercel 데모와 e2e 가 쓴다. 라우트의 프록시 증명 확인은
 *   거치지 않는다(그건 `src/app/api/[...slug]/route.test.ts` 가 본다).
 * 목 한 벌 카드부터 서버 목도 같은 MSW 핸들러로 응답한다. 그래도 server 쪽을 남겨 어댑터(경로 변환,
 * 본문 전달)까지 같은 스키마로 확인한다.
 */
export const useMockSource = (source: MockSource) => {
  if (source === 'msw') return;
  server.use(
    http.get('*/api/proxy/*', async ({ request }) => {
      const url = new URL(request.url);
      const slug = url.pathname.replace(/^\/api\/proxy\//, '').split('/');
      return serveMock(new NextRequest(url), slug);
    }),
  );
};
