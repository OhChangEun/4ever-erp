// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { isSameOriginRequest } from './sameOrigin';

const req = (headers: Record<string, string>) =>
  new NextRequest('http://localhost:3100/api/proxy/x', { method: 'POST', headers });

describe('같은 출처 판정(CSRF)', () => {
  it.each([
    [{ 'sec-fetch-site': 'same-origin' }, true],
    [{ 'sec-fetch-site': 'none' }, true],
    // SameSite=lax 가 못 막는 같은 site 의 다른 출처(다른 포트, 서브도메인)
    [{ 'sec-fetch-site': 'same-site' }, false],
    [{ 'sec-fetch-site': 'cross-site' }, false],
    // Sec-Fetch-Site 가 없는 구형 브라우저: Origin 으로 본다
    [{ origin: 'http://localhost:3100' }, true],
    [{ origin: 'http://evil.test' }, false],
    [{ origin: 'http://localhost:3000' }, false],
  ])('%o → %s', (headers, expected) => {
    expect(isSameOriginRequest(req(headers))).toBe(expected);
  });

  it('헤더가 둘 다 없는 비브라우저 요청은 통과(기존 동작)', () => {
    expect(isSameOriginRequest(req({}))).toBe(true);
  });
});
