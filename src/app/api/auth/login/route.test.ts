// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { SESSION_COOKIE } from '@/server/auth/session';
import { POST } from './route';
import { GET as me } from '../me/route';

const APP = 'http://localhost:3100';

const login = (loginId: unknown) =>
  POST(
    new NextRequest(`${APP}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: APP },
      body: JSON.stringify({ loginId }),
    }),
  );

const meWith = (session: string) =>
  me(
    new NextRequest(`${APP}/api/auth/me`, { headers: { cookie: `${SESSION_COOKIE}=${session}` } }),
  );

// 카드 "로그인 아이디와 생산 데모 계정"
describe('데모 로그인 라우트', () => {
  it('pp_admin 은 PP_ADMIN 세션을 받고 /api/auth/me 도 PP_ADMIN 을 돌려준다', async () => {
    const res = await login('pp_admin');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ user: { name: '생산 관리자', role: 'PP_ADMIN' } });

    const session = res.cookies.get(SESSION_COOKIE)?.value ?? '';
    expect(await verifySession(session)).toEqual({ sub: 'pp_admin', role: 'PP_ADMIN' });

    const meRes = await meWith(session);
    expect(meRes.status).toBe(200);
    expect(await meRes.json()).toMatchObject({
      user: { name: '생산 관리자', email: 'pp_admin@everp.local', role: 'PP_ADMIN' },
    });
  });

  it.each(['mm_admin', 'MM_ADMIN', '  Mm_Admin  '])(
    '"%s" 는 구매 관리자 세션을 받는다(세션의 sub 는 소문자 아이디)',
    async (loginId) => {
      const res = await login(loginId);
      expect(res.status).toBe(200);
      const session = res.cookies.get(SESSION_COOKIE)?.value ?? '';
      expect(await verifySession(session)).toEqual({ sub: 'mm_admin', role: 'MM_ADMIN' });
    },
  );

  it.each(['nobody', '', 'constructor', '__proto__'])(
    '없는 아이디 "%s" 는 401 이고 쿠키를 심지 않는다',
    async (loginId) => {
      const res = await login(loginId);
      expect(res.status).toBe(401);
      expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
    },
  );

  it('아이디가 글자가 아니면 400', async () => {
    expect((await login(1)).status).toBe(400);
  });
});
