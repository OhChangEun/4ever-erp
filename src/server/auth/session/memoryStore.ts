import 'server-only';
import { generateRandomBase64Url } from '../pkce';
import type { SessionData, SessionStore, StoredSession } from './store';

interface Entry {
  data: SessionData;
  expiresAt: number;
}

/**
 * 프로세스 안의 Map. Next 는 proxy 와 라우트 핸들러를 다른 번들로 만들어 모듈 변수가 따로 생긴다.
 * 같은 프로세스에서 하나를 나누도록 globalThis 에 둔다. 인스턴스가 여럿이면 나뉘지 않는다(로컬 개발 전용, 결정 9).
 */
const REGISTRY = Symbol.for('everp.auth.memorySessions');

const registry = (): Map<string, Entry> => {
  const existing: unknown = Reflect.get(globalThis, REGISTRY);
  if (existing instanceof Map) return existing;
  const created = new Map<string, Entry>();
  Reflect.set(globalThis, REGISTRY, created);
  return created;
};

const toStored = (data: SessionData): StoredSession => ({
  ...data,
  upstreamToken: data.tokens?.accessToken ?? '',
});

/**
 * OIDC 저장소(결정 9). 쿠키에는 추측할 수 없는 sid 만 두고 IdP 토큰은 서버 메모리에 둔다.
 * 브라우저는 토큰을 볼 수 없고, 서버가 세션을 먼저 끊을 수 있다(백채널 로그아웃).
 */
export const createMemorySessionStore = (maxAgeSeconds = 60 * 60 * 8): SessionStore => ({
  maxAgeSeconds,
  async create(data) {
    const sid = generateRandomBase64Url(32);
    registry().set(sid, { data, expiresAt: Date.now() + maxAgeSeconds * 1000 });
    return sid;
  },
  async get(sid) {
    const entry = registry().get(sid);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      registry().delete(sid);
      return null;
    }
    return toStored(entry.data);
  },
  async update(sid, data) {
    const entry = registry().get(sid);
    if (entry) entry.data = data;
  },
  async delete(sid) {
    registry().delete(sid);
  },
  async deleteMatching({ sub, idpSid }) {
    // OpenID Back-Channel Logout 2.5: sid 가 있으면 그 IdP 세션만 끝낸다(같은 사용자의 다른 브라우저는 남는다).
    // sid 없이 sub 만 오면 그 사용자의 모든 세션을 끝낸다. 리뷰 지적(P2): 예전엔 둘 중 하나만 맞아도 지웠다
    const matches = (data: SessionData) =>
      idpSid !== undefined
        ? data.idpSid === idpSid && (sub === undefined || data.sub === sub)
        : sub !== undefined && data.sub === sub;
    for (const [sid, entry] of registry()) {
      if (matches(entry.data)) registry().delete(sid);
    }
  },
});

export const memorySessionStore = createMemorySessionStore();
