// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createMemorySessionStore } from './memoryStore';

const seed = async () => {
  const store = createMemorySessionStore();
  const a = await store.create({ sub: 'u1', role: 'ALL_ADMIN', idpSid: 'browser-a' });
  const b = await store.create({ sub: 'u1', role: 'ALL_ADMIN', idpSid: 'browser-b' });
  const other = await store.create({ sub: 'u2', role: 'FCM_ADMIN', idpSid: 'browser-c' });
  const alive = async () =>
    [a, b, other]
      .map(async (sid) => (await store.get(sid)) !== null)
      .reduce(async (acc, next) => [...(await acc), await next], Promise.resolve<boolean[]>([]));
  return { store, a, alive };
};

describe('메모리 세션 저장소', () => {
  it('세션 ID 는 추측할 수 없는 43자이고 지우면 없다', async () => {
    const { store, a } = await seed();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await store.delete(a);
    await expect(store.get(a)).resolves.toBeNull();
  });

  it('백채널: sid 가 오면 그 IdP 세션만 끝내고 같은 사용자의 다른 브라우저는 남긴다', async () => {
    const { store, alive } = await seed();
    await store.deleteMatching({ sub: 'u1', idpSid: 'browser-a' });
    expect(await alive()).toEqual([false, true, true]);
  });

  it('백채널: sub 만 오면 그 사용자의 세션을 모두 끝낸다', async () => {
    const { store, alive } = await seed();
    await store.deleteMatching({ sub: 'u1' });
    expect(await alive()).toEqual([false, false, true]);
  });

  it('만료된 세션은 읽을 때 지운다', async () => {
    const store = createMemorySessionStore(-1);
    const sid = await store.create({ sub: 'u1', role: 'ALL_ADMIN' });
    await expect(store.get(sid)).resolves.toBeNull();
  });
});
