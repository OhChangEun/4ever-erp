// @vitest-environment node
// 서버 전용 모듈이라 jsdom 이 아니라 Node 로 돌린다. jsdom 에선 Uint8Array realm 이 달라 jose 가 키를 거부한다.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { signSession, verifySession } from './session';

describe('session 쿠키 서명과 검증', () => {
  it('서명한 토큰은 sub 와 role 만 돌려준다', async () => {
    const token = await signSession({ sub: 'admin', role: 'ALL_ADMIN' });
    await expect(verifySession(token)).resolves.toEqual({ sub: 'admin', role: 'ALL_ADMIN' });
  });

  it('payload 한 글자를 바꾸면 서명이 깨져 null 이다', async () => {
    const token = await signSession({ sub: 'admin', role: 'HRM_USER' });
    const [header, payload, signature] = token.split('.');
    // base64url 로 디코드해 role 을 ALL_ADMIN 으로 바꿔치기
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    decoded.role = 'ALL_ADMIN';
    const forged = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    await expect(verifySession(`${header}.${forged}.${signature}`)).resolves.toBeNull();
  });

  it('다른 키로 서명한 토큰은 null 이다', async () => {
    const other = new TextEncoder().encode('another-secret-that-is-not-ours-at-all');
    const token = await new SignJWT({ role: 'ALL_ADMIN' })
      .setSubject('admin')
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(other);
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it('role 이 없는 payload 는 null 이다', async () => {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const token = await new SignJWT({})
      .setSubject('admin')
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(secret);
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it('깨진 문자열은 throw 하지 않고 null 이다', async () => {
    await expect(verifySession('not-a-jwt')).resolves.toBeNull();
  });
});

describe('SESSION_SECRET 이 없을 때', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('import 는 되고(빌드가 죽지 않는다), 서명과 검증을 부를 때 throw 한다', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    vi.resetModules();
    const fresh = await import('./session');
    await expect(fresh.signSession({ sub: 'admin', role: 'ALL_ADMIN' })).rejects.toThrow(
      /SESSION_SECRET/,
    );
    // null 이면 "로그인이 풀렸다"로 보여 설정 오류를 숨긴다. 조용히 넘어가지 않는다.
    await expect(fresh.verifySession('a.b.c')).rejects.toThrow(/SESSION_SECRET/);
  });
});

describe('세션 토큰 알고리즘 고정', () => {
  it('alg 를 none 으로 바꾼 토큰(서명 없음)은 null 이다', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'admin', role: 'ALL_ADMIN', exp: Math.floor(Date.now() / 1000) + 60 }),
    ).toString('base64url');
    await expect(verifySession(`${header}.${payload}.`)).resolves.toBeNull();
  });

  it('역할 표 밖의 role 이 든 세션은 null 이다', async () => {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const token = await new SignJWT({ role: 'ROOT' })
      .setSubject('admin')
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret);
    await expect(verifySession(token)).resolves.toBeNull();
  });
});
