// @vitest-environment node
// jose 가 jsdom 의 Uint8Array 를 키로 받지 않아 Node 로 돈다(session.test.ts 와 같은 이유)
import { describe, expect, it } from 'vitest';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, endSession, readSession, startSession } from './index';

/** NextResponse 가 심은 Set-Cookie 를 다음 요청의 쿠키처럼 읽는다 */
const cookiesFrom = (res: NextResponse) => ({
  get: (name: string) => {
    const cookie = res.cookies.get(name);
    return cookie && cookie.value !== '' ? { value: cookie.value } : undefined;
  },
});

describe('세션 모듈(데모 쿠키 저장소)', () => {
  it('세션을 열면 httpOnly 쿠키가 심기고, 그 쿠키로 같은 사용자를 읽는다', async () => {
    const res = NextResponse.json({});
    await startSession(res, { sub: 'admin', role: 'ALL_ADMIN' });
    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');

    const session = await readSession(cookiesFrom(res));
    expect(session).toMatchObject({ sub: 'admin', role: 'ALL_ADMIN' });
    // 데모 저장소는 업스트림에 세션 토큰을 그대로 Bearer 로 보낸다(실 IdP 토큰이 없다)
    expect(session?.upstreamToken).toBe(cookie?.value);
  });

  it('쿠키가 없거나 깨졌으면 null', async () => {
    await expect(readSession({ get: () => undefined })).resolves.toBeNull();
    await expect(readSession({ get: () => ({ value: 'garbage' }) })).resolves.toBeNull();
  });

  it('세션을 닫으면 쿠키를 지우는 Set-Cookie 가 나간다', async () => {
    const res = NextResponse.json({});
    await endSession(res, { get: () => ({ value: 'x' }) });
    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe('');
    expect(cookie?.path).toBe('/');
  });
});
