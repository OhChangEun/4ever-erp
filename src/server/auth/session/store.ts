import type { Role } from '@/lib/authz/policy';

/** 세션에 담는 값. OIDC 카드에서 IdP 토큰(access, refresh, id)이 더해진다 */
export interface SessionData {
  sub: string;
  role: Role;
}

/** 저장소에서 읽은 세션. upstreamToken 은 API 프록시가 업스트림에 Bearer 로 붙이는 값 */
export interface StoredSession extends SessionData {
  upstreamToken: string;
}

/**
 * 세션 저장소 경계(계획 8절 2번). 쿠키에 무엇을 넣는지는 구현이 정한다.
 * - 데모(cookieStore): 서명 JWT 자체가 쿠키 값이다. 상태가 없다.
 * - OIDC(다음 카드): 쿠키에는 sid 만, 토큰은 서버 저장소에.
 */
export interface SessionStore {
  /** 세션을 만들고 쿠키에 넣을 값을 돌려준다 */
  create(data: SessionData): Promise<string>;
  /** 쿠키 값으로 세션을 읽는다. 없거나 깨졌거나 만료면 null */
  get(cookieValue: string): Promise<StoredSession | null>;
  /** 이 쿠키의 세션을 지운다 */
  delete(cookieValue: string): Promise<void>;
  /** 한 사용자의 모든 세션을 지운다(백채널 로그아웃) */
  deleteBySub(sub: string): Promise<void>;
  /** 쿠키 수명(초) */
  readonly maxAgeSeconds: number;
}
