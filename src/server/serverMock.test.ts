// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * 서버 목 어댑터는 핸들러에 넘기기 전에 `Authorization` 을 해시로 바꾼다(목이 쓰기 결과를 따르게 리뷰 P3).
 * 목 상태 저장소와 알림 목이 이 값을 로그인별 키로 쓴다. 세션 토큰 원문이 저장소 키로 서버 메모리에 남지 않게 한다.
 */
const seen = vi.hoisted(() => ({ authorization: new Array<string | null>() }));

vi.mock('@/mocks/handlers', async () => {
  const { http, HttpResponse } = await import('msw');
  return {
    handlers: [
      http.all('*', ({ request }) => {
        seen.authorization.push(request.headers.get('authorization'));
        return HttpResponse.json({ status: 200, success: true, message: 'OK', data: null });
      }),
    ],
  };
});

const { serveMock } = await import('./serverMock');

const call = async (token?: string) => {
  const headers = new Headers(token ? { authorization: `Bearer ${token}` } : {});
  await serveMock(new NextRequest('http://localhost:3100/api/any/path', { headers }), [
    'any',
    'path',
  ]);
  return seen.authorization.at(-1);
};

describe('서버 목 어댑터의 로그인 키', () => {
  it('핸들러가 받는 요청에 세션 토큰 원문이 없다', async () => {
    const key = await call('session.jwt.secret-part');
    expect(key).toEqual(expect.any(String));
    expect(key).not.toContain('session.jwt.secret-part');
    expect(key).not.toContain('Bearer');
  });

  it('같은 토큰은 같은 키, 다른 토큰은 다른 키', async () => {
    const first = await call('token-a');
    expect(await call('token-a')).toBe(first);
    expect(await call('token-b')).not.toBe(first);
  });

  it('Authorization 이 없으면 만들어 넣지 않는다', async () => {
    expect(await call()).toBeNull();
  });
});
