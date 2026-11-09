import { describe, expect, it } from 'vitest';
import { HttpHandler, matchRequestUrl } from 'msw';
import { handlers } from './handlers';

/**
 * MSW 는 핸들러를 등록 순서대로 맞춰 본다. `payroll/:id` 가 `payroll/statuses` 보다 앞에 있으면
 * 상태 목록 요청이 상세 핸들러로 간다(목 한 벌 카드에서 찾은 결함 2건).
 * 구체 경로마다 "처음 맞는 핸들러가 자기 자신인지" 확인한다.
 */
const httpHandlers = handlers.filter((h): h is HttpHandler => h instanceof HttpHandler);

const isLiteral = (path: unknown): path is string =>
  typeof path === 'string' && !path.includes(':') && !path.includes('*');

describe('MSW 핸들러 순서', () => {
  it('구체 경로가 앞에 등록된 :param 경로에 가려지지 않는다', () => {
    const shadowed: string[] = [];
    httpHandlers.forEach((handler, index) => {
      const { method, path } = handler.info;
      if (!isLiteral(path)) return;
      const url = new URL(path, location.origin);
      const first = httpHandlers.find(
        (other) =>
          (other.info.method === method || other.info.method === 'all') &&
          matchRequestUrl(url, other.info.path, location.origin).matches,
      );
      if (first && first !== httpHandlers[index]) {
        shadowed.push(`${String(method)} ${path} → ${String(first.info.path)}`);
      }
    });
    expect(shadowed).toEqual([]);
  });
});
