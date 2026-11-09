import 'server-only';
import { signSession, verifySession } from '@/lib/auth/session';
import type { SessionStore } from './store';

/**
 * 데모 저장소. 서버가 서명한 JWT(sub, role, 만료 1일)를 쿠키 값으로 쓴다.
 * 상태가 없어 Vercel 인스턴스끼리 메모리를 나누지 않아도 된다. 대신 서버가 세션을 먼저 끊을 수 없다.
 */
export const cookieSessionStore: SessionStore = {
  maxAgeSeconds: 60 * 60 * 24,
  create: (data) => signSession({ sub: data.sub, role: data.role }),
  get: async (cookieValue) => {
    const payload = await verifySession(cookieValue);
    // 실 IdP 토큰이 없어 세션 JWT 자체를 업스트림 Bearer 로 쓴다(ARCHITECTURE.md 3절)
    return payload ? { ...payload, upstreamToken: cookieValue } : null;
  },
  // 데모 세션에는 갱신할 토큰이 없다
  update: async () => undefined,
  // 서명 쿠키는 브라우저가 지우면 끝이다. 서버에 지울 것이 없다
  delete: async () => undefined,
  // 상태가 없어 특정 사용자의 세션을 서버가 끊을 수 없다(데모의 한계, OIDC 저장소에서 지원)
  deleteMatching: async () => undefined,
};
