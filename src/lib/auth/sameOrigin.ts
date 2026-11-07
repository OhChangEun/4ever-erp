import 'server-only';
import type { NextRequest } from 'next/server';

// 상태를 바꾸는 요청이 같은 출처에서 왔는지 본다.
// SameSite=lax 쿠키는 같은 site의 다른 출처(예: 같은 호스트의 다른 포트, 다른 서브도메인)를 못 막는다.
// 로그인 CSRF가 그 틈으로 들어온다. 그 틈을 닫는다.
export function isSameOriginRequest(req: NextRequest): boolean {
  // 최신 브라우저: Sec-Fetch-Site. 사용자가 주소창으로 직접 연 요청은 'none', 같은 출처 스크립트는 'same-origin'.
  const site = req.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';

  // Sec-Fetch-Site 미지원(구형 브라우저) fallback: Origin 헤더를 요청 출처와 비교.
  const origin = req.headers.get('origin');
  if (!origin) return true; // Origin 없는 비브라우저 요청(curl, 서버-서버)은 기존 동작 유지
  return origin === req.nextUrl.origin;
}
