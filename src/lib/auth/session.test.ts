// @vitest-environment node
// 서버 전용 모듈이라 jsdom 이 아니라 Node 로 돌린다. jsdom 에선 Uint8Array realm 이 달라 jose 가 키를 거부한다.
import { describe, expect, it } from 'vitest';
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
