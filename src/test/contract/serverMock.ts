import { http } from 'msw';
import { NextRequest } from 'next/server';
import { server } from '@/test/msw-server';
import { GET as serverMockGet } from '@/app/api/[...slug]/route';

export type MockSource = 'msw' | 'server';

/**
 * 계약 테스트의 목 출처를 고른다.
 * - msw: 브라우저 목(`src/mocks/handlers`). 단위 테스트와 `NEXT_PUBLIC_API_MOCKING` 이 쓴다.
 * - server: 서버 목 라우트(`src/app/api/[...slug]/route.ts`). Vercel 데모와 e2e 가 쓴다.
 * 두 목은 따로 손으로 쓴 것이라 서로 어긋날 수 있다. 같은 스키마로 둘 다 확인한다.
 */
export const useMockSource = (source: MockSource) => {
  if (source === 'msw') return;
  server.use(
    http.get('*/api/proxy/*', async ({ request }) => {
      const url = new URL(request.url);
      const slug = url.pathname.replace(/^\/api\/proxy\//, '').split('/');
      return serverMockGet(new NextRequest(url), { params: Promise.resolve({ slug }) });
    }),
  );
};
