import type { Role } from '@/lib/authz/policy';
import type { TokenSet } from '../idp/types';

/** 세션에 담는 값. OIDC 세션은 IdP 토큰과 표시용 이름, 이메일, IdP 세션 ID 를 더 가진다 */
export interface SessionData {
  sub: string;
  role: Role;
  name?: string;
  email?: string;
  /** IdP 의 세션 ID(ID 토큰 sid). 백채널 로그아웃이 이 값으로 찾는다 */
  idpSid?: string;
  tokens?: TokenSet;
}

/** 저장소에서 읽은 세션. upstreamToken 은 API 프록시가 업스트림에 Bearer 로 붙이는 값 */
export interface StoredSession extends SessionData {
  upstreamToken: string;
}

/**
 * 세션 저장소 경계(계획 8절 2번). 쿠키에 무엇을 넣는지는 구현이 정한다.
 * - 데모(cookieStore): 서명 JWT 자체가 쿠키 값이다. 상태가 없다.
 * - OIDC(memoryStore): 쿠키에는 sid 만, 토큰은 서버 메모리에.
 */
export interface SessionStore {
  /** 세션을 만들고 쿠키에 넣을 값을 돌려준다 */
  create(data: SessionData): Promise<string>;
  /** 쿠키 값으로 세션을 읽는다. 없거나 깨졌거나 만료면 null */
  get(cookieValue: string): Promise<StoredSession | null>;
  /** 세션 값을 바꾼다(토큰 갱신). 상태가 없는 저장소는 지원하지 않는다 */
  update(cookieValue: string, data: SessionData): Promise<void>;
  /** 이 쿠키의 세션을 지운다 */
  delete(cookieValue: string): Promise<void>;
  /** 사용자(sub)나 IdP 세션(idpSid)이 같은 세션을 모두 지운다(백채널 로그아웃) */
  deleteMatching(match: { sub?: string; idpSid?: string }): Promise<void>;
  /** 쿠키 수명(초) */
  readonly maxAgeSeconds: number;
}
