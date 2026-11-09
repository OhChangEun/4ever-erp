// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('세션 쿠키 이름', () => {
  it('운영 빌드는 __Host- 접두사(Secure, Path=/, Domain 없음 강제)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const { SESSION_COOKIE } = await import('./index');
    expect(SESSION_COOKIE).toBe('__Host-session');
  });

  it('운영에서 지우는 Set-Cookie 에도 Secure, Path=/ 가 있다(없으면 브라우저가 __Host- 삭제를 무시)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const { NextResponse } = await import('next/server');
    const { endSession, clearSessionCookie } = await import('./index');
    for (const remove of [
      (res: InstanceType<typeof NextResponse>) => endSession(res, { get: () => ({ value: 'x' }) }),
      (res: InstanceType<typeof NextResponse>) => clearSessionCookie(res),
    ]) {
      const res = NextResponse.json({});
      await remove(res);
      const header = res.headers.get('set-cookie') ?? '';
      expect(header).toMatch(/^__Host-session=;/);
      expect(header).toMatch(/Secure/i);
      expect(header).toMatch(/Path=\//);
      expect(header).toMatch(/Max-Age=0/);
    }
  });

  it('개발은 http 라 Secure 를 못 걸어 접두사 없이', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const { SESSION_COOKIE } = await import('./index');
    expect(SESSION_COOKIE).toBe('session');
  });
});
