import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './returnTo';

describe('로그인 뒤 돌아갈 경로(오픈 리다이렉트 방지)', () => {
  it.each([
    ['/purchase', '/purchase'],
    ['/sales?tab=orders', '/sales?tab=orders'],
    ['//evil.com', '/dashboard'],
    ['/\\evil.com', '/dashboard'],
    ['https://evil.com', '/dashboard'],
    // URL 파서가 탭, 줄바꿈을 지우면 //evil.com 이 된다(SSO 포털 카드 리뷰에서 발견한 우회)
    ['/\t/evil.com', '/dashboard'],
    ['/\n/evil.com', '/dashboard'],
    ['/\r\n/evil.com', '/dashboard'],
    ['/purchase#row-3', '/purchase#row-3'],
    // 점 경로가 풀린 뒤 //evil.com 이 되는 우회(리뷰 2회차)
    ['/a/..//evil.com', '/dashboard'],
    ['/a/../\\evil.com', '/dashboard'],
    ['/a/../purchase', '/purchase'],
    ['javascript:alert(1)', '/dashboard'],
    ['', '/dashboard'],
    [null, '/dashboard'],
  ])('%s → %s', (value, expected) => {
    expect(safeReturnTo(value)).toBe(expected);
  });
});
