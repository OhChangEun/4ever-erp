import type { IdentityProvider } from '../idp/types';
import type { SessionStore, StoredSession } from './store';

/** access token 이 이 시간 안에 만료되면 미리 갱신한다(계획 8절 그림의 "만료 30초 전") */
export const REFRESH_LEEWAY_MS = 30_000;

/**
 * 진행 중인 갱신. sid 별로 하나만 돈다(single-flight).
 * 동시 요청 5개가 각자 refresh 를 부르면 Keycloak 의 refresh token rotation 때문에 두 번째부터 실패하고
 * 세션이 끊긴다(race condition). 같은 sid 의 요청은 첫 갱신의 Promise 를 같이 기다린다.
 * Next 는 번들마다 모듈 변수가 따로라 globalThis 에 둔다.
 */
const IN_FLIGHT = Symbol.for('everp.auth.refreshInFlight');

const inFlight = <TRole extends string>(): Map<string, Promise<StoredSession<TRole> | null>> => {
  const existing: unknown = Reflect.get(globalThis, IN_FLIGHT);
  if (existing instanceof Map) return existing;
  const created = new Map<string, Promise<StoredSession<TRole> | null>>();
  Reflect.set(globalThis, IN_FLIGHT, created);
  return created;
};

/**
 * 업스트림에 보낼 수 있는 세션을 돌려준다. 곧 만료되면 갱신하고 저장소를 고친다.
 * 갱신이 실패하면(refresh token 만료, IdP 에서 세션 끊김) 세션을 지우고 null. 호출하는 쪽은 401 로 답한다.
 */
export const ensureFreshSession = async <TRole extends string>(
  sid: string,
  session: StoredSession<TRole>,
  store: SessionStore<TRole>,
  idp: IdentityProvider,
  now: number = Date.now(),
): Promise<StoredSession<TRole> | null> => {
  const tokens = session.tokens;
  if (!tokens || tokens.expiresAt - now > REFRESH_LEEWAY_MS) return session;

  const running = inFlight<TRole>().get(sid);
  if (running) return running;

  const refreshing = (async () => {
    if (!tokens.refreshToken) {
      await store.delete(sid);
      return null;
    }
    try {
      const next = await idp.refresh(tokens.refreshToken);
      const data = {
        ...session,
        tokens: {
          ...next,
          // IdP 가 새 refresh token 을 안 주면(rotation 꺼짐) 예전 것을 계속 쓴다
          refreshToken: next.refreshToken ?? tokens.refreshToken,
          idToken: next.idToken ?? tokens.idToken,
        },
      };
      await store.update(sid, data);
      return { ...data, upstreamToken: data.tokens.accessToken };
    } catch {
      await store.delete(sid);
      return null;
    }
  })().finally(() => inFlight().delete(sid));

  inFlight<TRole>().set(sid, refreshing);
  return refreshing;
};
