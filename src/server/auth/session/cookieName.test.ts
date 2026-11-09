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

  it('개발은 http 라 Secure 를 못 걸어 접두사 없이', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const { SESSION_COOKIE } = await import('./index');
    expect(SESSION_COOKIE).toBe('session');
  });
});
