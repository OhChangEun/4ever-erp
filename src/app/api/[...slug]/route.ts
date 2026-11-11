import { NextResponse, type NextRequest } from 'next/server';
import { MOCK_PROOF_HEADER, verifyMockProof } from '@/server/auth/mockProof';
import { serveMock } from '@/server/serverMock';

/**
 * 서버 목. `BACKEND_API_URL` 이 없으면 프록시(`/api/proxy/*`)가 여기로 넘긴다(Vercel 데모, e2e).
 * 응답은 단위 테스트와 같은 MSW 핸들러가 만든다(`src/server/serverMock.ts`).
 *
 * 프록시가 넘긴 호출만 받는다. 이 라우트는 페이지 프록시(`src/proxy.ts` matcher 가 api 를 뺀다)와
 * API 인가 표(`canAccessApi`, `/api/proxy/*` 에만 걸린다) 밖이라, 예전엔 로그인 없이 `/api/<경로>` 를 직접 부르면
 * 목 응답을 받고 `x-session-role` 을 지어내 아무 역할의 응답이나 받았다(남은 표시 결함 3 리뷰 P2).
 * 프록시가 SESSION_SECRET 으로 서명한 증명(`x-mock-proof`)을 확인하고, 역할은 헤더가 아니라 증명에서 읽는다.
 */
async function handler(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const role = await verifyMockProof(request.headers.get(MOCK_PROOF_HEADER));
  if (!role) {
    // 모양은 프록시가 만드는 실패 응답과 같다
    return NextResponse.json(
      { status: 401, success: false, message: '로그인이 필요합니다.' },
      { status: 401 },
    );
  }
  const headers = new Headers(request.headers);
  headers.delete(MOCK_PROOF_HEADER);
  headers.set('x-session-role', role);

  const { slug } = await params;
  return serveMock(request, slug, headers);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
