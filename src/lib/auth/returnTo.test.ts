import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './returnTo';

describe('로그인 뒤 돌아갈 경로(오픈 리다이렉트 방지)', () => {
  it.each([
    ['/purchase', '/purchase'],
    ['/sales?tab=orders', '/sales?tab=orders'],
    ['//evil.com', '/dashboard'],
    ['/\\evil.com', '/dashboard'],
    ['https://evil.com', '/dashboard'],
    ['javascript:alert(1)', '/dashboard'],
    ['', '/dashboard'],
    [null, '/dashboard'],
  ])('%s → %s', (value, expected) => {
    expect(safeReturnTo(value)).toBe(expected);
  });
});
