import type {
  SessionData as BaseSessionData,
  SessionStore as BaseSessionStore,
  StoredSession as BaseStoredSession,
} from '@everp/auth';
import type { Role } from '@/lib/authz/policy';

/**
 * 세션 모양과 저장소 경계는 @everp/auth 가 정한다(SSO 포털 카드에서 옮김). 여기서는 역할을 erp 의 Role 로 좁힌다.
 * - 데모(cookieStore): 서명 JWT 자체가 쿠키 값이다. 상태가 없다.
 * - OIDC(memoryStore): 쿠키에는 sid 만, 토큰은 서버 메모리에.
 */
export type SessionData = BaseSessionData<Role>;
export type StoredSession = BaseStoredSession<Role>;
export type SessionStore = BaseSessionStore<Role>;
