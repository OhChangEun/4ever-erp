// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createMemorySessionStore } from './memoryStore';
import { ensureFreshSession } from './refresh';
import type { IdentityProvider } from '../idp/types';

const idpWith = (refresh: IdentityProvider['refresh']): IdentityProvider => ({
  authorizeUrl: vi.fn(),
  exchangeCode: vi.fn(),
  refresh,
  verifyIdToken: vi.fn(),
  endSessionUrl: vi.fn(),
  verifyLogoutToken: vi.fn(),
});

const NOW = 1_000_000;

const seed = async (expiresAt: number) => {
  const store = createMemorySessionStore();
  const sid = await store.create({
    sub: 'u1',
    role: 'ALL_ADMIN',
    tokens: { accessToken: 'old', refreshToken: 'r1', idToken: 'id1', expiresAt },
  });
  const session = await store.get(sid);
  if (!session) throw new Error('seed failed');
  return { store, sid, session };
};

describe('토큰 갱신 single-flight', () => {
  it('만료까지 30초보다 많이 남았으면 갱신하지 않는다', async () => {
    const { store, sid, session } = await seed(NOW + 60_000);
    const refresh = vi.fn();
    await expect(ensureFreshSession(sid, session, store, idpWith(refresh), NOW)).resolves.toBe(
      session,
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('동시 요청 5개가 와도 refresh 는 1번이고 모두 새 토큰을 쓴다', async () => {
    const { store, sid, session } = await seed(NOW + 10_000);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const refresh = vi.fn(async () => {
      await gate;
      return { accessToken: 'new', refreshToken: 'r2', expiresAt: NOW + 60_000 };
    });
    const idp = idpWith(refresh);
    const results = Promise.all(
      Array.from({ length: 5 }, () => ensureFreshSession(sid, session, store, idp, NOW)),
    );
    release();
    const sessions = await results;
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sessions.map((s) => s?.upstreamToken)).toEqual(['new', 'new', 'new', 'new', 'new']);
    // 저장소에도 새 토큰이 남는다. id token 은 IdP 가 안 줬으니 예전 것 유지
    expect((await store.get(sid))?.tokens).toMatchObject({
      accessToken: 'new',
      refreshToken: 'r2',
      idToken: 'id1',
    });
  });

  it('갱신이 실패하면 세션을 지우고 null(호출하는 쪽이 401)', async () => {
    const { store, sid, session } = await seed(NOW + 1_000);
    const idp = idpWith(vi.fn(async () => Promise.reject(new Error('invalid_grant'))));
    await expect(ensureFreshSession(sid, session, store, idp, NOW)).resolves.toBeNull();
    await expect(store.get(sid)).resolves.toBeNull();
  });
});
