/**
 * 목이 쓰기 결과를 기억하는 곳(카드 "목이 쓰기 결과를 따르게").
 * 승인, 반려, 수정, 생성 핸들러가 여기에 적고 목록과 상세 핸들러가 읽는다.
 *
 * 로그인별로 나눈다. 서버 목(`src/app/api/[...slug]/route.ts`)에는 프록시가 세션에서 꺼낸
 * `Authorization: Bearer ...` 가 붙어 오므로 그 값이 키다. 한 방문자가 전부 승인해도 다음 방문자는 처음 상태를 본다.
 * 브라우저 MSW 와 단위 테스트에는 그 헤더가 없어 저장소 하나를 같이 쓴다.
 * 데모 세션 JWT 는 계정, 역할, 발급 시각(초)으로 만들어져 같은 계정이 같은 초에 로그인하면 키가 같다.
 */

// shortcut: 메모리 Map 이라 서버리스 인스턴스가 바뀌거나 다시 배포되면 처음 상태로 돌아가고 인스턴스끼리 서로 다르게 보일 수 있다, 데모가 인스턴스 사이에서도 같아야 하면 외부 저장소(KV)로 올린다
/** 기억하는 로그인 수. 넘으면 가장 오래 안 쓴 것부터 지운다 */
export const MAX_MOCK_SESSIONS = 200;

/** 최근에 쓴 순서(Set 은 넣은 순서를 지킨다). 맨 앞이 가장 오래된 로그인 */
const sessions = new Set<string>();
const stores: Array<{ delete: (session: string) => boolean; clear: () => void }> = [];

const touch = (session: string) => {
  sessions.delete(session);
  sessions.add(session);
  if (sessions.size <= MAX_MOCK_SESSIONS) return;
  const oldest = sessions.values().next();
  if (oldest.done) return;
  sessions.delete(oldest.value);
  for (const store of stores) store.delete(oldest.value);
};

/**
 * 도메인 목의 상태 한 벌. `init` 이 처음 상태를 만들고, 돌려준 함수가 요청의 로그인에 맞는 상태를 준다.
 * 핸들러는 받은 객체를 그대로 고친다(React 상태가 아니다).
 */
export const mockState = <T extends object>(init: () => T) => {
  const bySession = new Map<string, T>();
  stores.push(bySession);
  return (request: Request): T => {
    const session = request.headers.get('authorization') ?? '';
    touch(session);
    const existing = bySession.get(session);
    if (existing) return existing;
    const created = init();
    bySession.set(session, created);
    return created;
  };
};

/** 모든 로그인의 상태를 지운다. 단위 테스트는 테스트마다 부른다(vitest.setup.ts) */
export const resetMockState = () => {
  sessions.clear();
  for (const store of stores) store.clear();
};
