/**
 * 목이 쓰기 결과를 기억하는 곳(카드 "목이 쓰기 결과를 따르게").
 * 승인, 반려, 수정, 생성 핸들러가 여기에 적고 목록과 상세 핸들러가 읽는다.
 *
 * 로그인별로 나눈다. 서버 목(`src/app/api/[...slug]/route.ts`)에는 프록시가 세션에서 꺼낸
 * `Authorization: Bearer ...` 가 붙어 오므로 그 값이 키다. 한 방문자가 전부 승인해도 다음 방문자는 처음 상태를 본다.
 * 그 값은 세션 토큰 원문이 아니라 서버 목 어댑터(`src/server/serverMock.ts`)가 바꿔 넣은 해시다.
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

// shortcut: 한 로그인이 만든 행은 목록마다 50개까지만 기억하고 넘으면 오래된 것부터 버린다(서버리스 메모리에 방문자마다 쌓이는 양을 묶는다. 목록 대부분은 `paged` 로 쪽을 잘라 보내지만 저장은 전부 한다), 데모에서 50건 넘게 만드는 흐름이 생기면 상한을 올린다
export const MAX_CREATED_ROWS = 50;

/** 목록마다 지금까지 만든 행 수. 오래된 행을 버린 뒤에도 번호가 겹치지 않게 따로 센다 */
const createdCounts = new WeakMap<object, number>();

/**
 * 새 행을 목록 끝에 붙인다. 생성 핸들러는 배열에 직접 push 하지 않고 이것만 쓴다(상한이 한 곳에 있다).
 * `make` 는 세 자리 순번을 받는다. 기본 행이 001 이라 만든 행은 `first`(기본 2)부터 센다.
 * 행이 상한으로 밀려나면 `onDrop` 에 그 행을 넘긴다. 행에 딸린 저장(품목 줄 등)을 여기서 같이 지운다
 */
export const addCreated = <T>(
  rows: T[],
  make: (serial: string) => T,
  first = 2,
  onDrop?: (row: T) => void,
) => {
  const count = createdCounts.get(rows) ?? 0;
  createdCounts.set(rows, count + 1);
  rows.push(make(String(first + count).padStart(3, '0')));
  if (rows.length <= MAX_CREATED_ROWS) return;
  const dropped = rows.shift();
  if (dropped !== undefined) onDrop?.(dropped);
};

/** 모든 로그인의 상태를 지운다. 단위 테스트는 테스트마다 부른다(vitest.setup.ts) */
export const resetMockState = () => {
  sessions.clear();
  for (const store of stores) store.clear();
};
