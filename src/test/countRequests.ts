import { onTestFinished } from 'vitest';
import { server } from './msw-server';

/**
 * 이 테스트 동안 메서드와 경로가 맞는 요청 수를 센다. 핸들러를 덮지 않아 목 상태는 그대로 따라간다.
 * 경로는 엔드포인트 상수를 그대로 받는다(쿼리 문자열은 빼고 비교한다).
 */
export const countRequests = (method: string, endpoint: string) => {
  const pathname = new URL(endpoint, 'http://localhost').pathname;
  let count = 0;
  const listener = ({ request }: { request: Request }) => {
    if (request.method === method && new URL(request.url).pathname === pathname) count += 1;
  };
  server.events.on('request:start', listener);
  onTestFinished(() => {
    server.events.removeListener('request:start', listener);
  });
  return () => count;
};
