import 'server-only';
import { createMemorySessionStore } from '@everp/auth';
import type { Role } from '@/lib/authz/policy';

/**
 * OIDC 저장소(결정 9). 쿠키에는 추측할 수 없는 sid 만 두고 IdP 토큰은 서버 메모리에 둔다.
 * 구현은 @everp/auth(포털과 같이 쓴다). 레지스트리 이름이 앱마다 달라 한 프로세스에서도 섞이지 않는다.
 */
export const memorySessionStore = createMemorySessionStore<Role>(
  60 * 60 * 8,
  'everp.auth.memorySessions',
);
