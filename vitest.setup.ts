import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './src/test/msw-server';
import { resetMockState } from './src/mocks/state';

// session.ts 는 서명과 검증을 부를 때 SESSION_SECRET 을 읽는다. 테스트 전용 값.
process.env.SESSION_SECRET ??= 'test-secret-32-bytes-long-for-vitest-only';

// 핸들러에 없는 요청은 통과시키지 않고 실패시킨다(fail-closed).
// 실제 네트워크가 테스트에 섞이면 통과 여부를 믿을 수 없다.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // 목이 기억한 쓰기 결과를 비운다. 한 테스트의 승인이나 생성이 다음 테스트의 목록에 남으면 안 된다
  resetMockState();
  cleanup();
});
afterAll(() => server.close());
