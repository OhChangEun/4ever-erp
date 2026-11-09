import { expect, test, type Page } from '@playwright/test';
import { keycloakEnv, oidcEnv } from './env';

/**
 * 실제 Keycloak 으로 OIDC 흐름을 확인한다. 계획 8절 6번의 검증 항목:
 * 로그인(PKCE), 토큰은 서버에만, 만료 전 갱신, RP 로그아웃, 백채널 로그아웃 뒤 다음 요청 401.
 */
const OIDC = oidcEnv();
const KEYCLOAK = keycloakEnv();
const PASSWORD = OIDC.E2E_OIDC_PASSWORD ?? '';
const ISSUER = OIDC.OIDC_ISSUER ?? '';
const KC = new URL(ISSUER).origin;

test.beforeAll(() => {
  // 값이 비면 Keycloak 폼이 "잘못된 비밀번호"로만 보여 원인을 찾기 어렵다
  expect(PASSWORD, 'dev/keycloak/.env.oidc 의 E2E_OIDC_PASSWORD').not.toBe('');
});

const loginViaKeycloak = async (page: Page, username: string, returnTo = '/dashboard') => {
  await page.goto(returnTo);
  await page.waitForURL(/\/login/);
  await page.getByRole('button', { name: '회사 계정으로 로그인' }).click();
  await page.waitForURL((url) => url.origin === KC, { timeout: 30_000 });
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => url.pathname.startsWith(returnTo), { timeout: 60_000 });
};

/** Keycloak 관리 API 로 한 사용자의 모든 세션을 끊는다(관리자가 강제 로그아웃한 상황) */
const adminLogoutUser = async (username: string) => {
  const tokenRes = await fetch(`${KC}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: KEYCLOAK.KC_BOOTSTRAP_ADMIN_USERNAME ?? '',
      password: KEYCLOAK.KC_BOOTSTRAP_ADMIN_PASSWORD ?? '',
    }),
  });
  const { access_token: adminToken } = (await tokenRes.json()) as { access_token: string };
  const headers = { authorization: `Bearer ${adminToken}` };
  const users = (await (
    await fetch(`${KC}/admin/realms/everp/users?username=${username}&exact=true`, { headers })
  ).json()) as { id: string }[];
  const res = await fetch(`${KC}/admin/realms/everp/users/${users[0].id}/logout`, {
    method: 'POST',
    headers,
  });
  expect(res.status).toBe(204);
};

test('Keycloak 으로 로그인하면 대시보드가 열리고, 쿠키에는 토큰이 아니라 sid 만 있다', async ({
  page,
  context,
}) => {
  await loginViaKeycloak(page, 'admin');
  await expect(page.getByRole('region', { name: '지표' })).toBeVisible();
  const session = (await context.cookies()).find((c) => c.name === 'session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(await page.evaluate(() => document.cookie)).not.toContain('session=');
  const me = await page.request.get('/api/auth/me');
  expect((await me.json()).user).toMatchObject({ role: 'ALL_ADMIN', email: 'admin@everp.local' });
});

test('역할 표대로 막는다: 재무 관리자는 인사 API 403', async ({ page }) => {
  await loginViaKeycloak(page, 'fcm_admin');
  expect((await page.request.get('/api/proxy/business/hrm/employee')).status()).toBe(403);
  expect((await page.request.get('/api/proxy/business/fcm/statistics')).status()).toBe(200);
});

test('access token(수명 60초)이 만료에 가까워도 동시 요청 5개가 모두 성공한다(갱신)', async ({
  page,
}) => {
  await loginViaKeycloak(page, 'admin');
  // 만료 30초 전부터 갱신한다. 31초 기다리면 다음 요청이 갱신을 탄다
  await page.waitForTimeout(31_000);
  const statuses = await page.evaluate(async () => {
    const calls = Array.from({ length: 5 }, () =>
      fetch('/api/proxy/dashboard/statistics').then((r) => r.status),
    );
    return Promise.all(calls);
  });
  expect(statuses).toEqual([200, 200, 200, 200, 200]);
  // rotation 으로 바뀐 refresh token 으로 한 번 더 갱신돼도 끊기지 않는다
  await page.waitForTimeout(31_000);
  expect((await page.request.get('/api/proxy/dashboard/statistics')).status()).toBe(200);
});

test('로그아웃하면 Keycloak 세션도 끝나 다시 로그인 화면을 거친다(RP 시작 로그아웃)', async ({
  page,
}) => {
  await loginViaKeycloak(page, 'admin');
  // 사이드바 프로필 버튼(이름에 Keycloak 의 성 EverP 가 들어간다)
  await page.getByRole('button', { name: /EverP/ }).click();
  await page.getByText('로그아웃').first().click();
  await page.waitForURL(/\/login/, { timeout: 30_000 });
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  // IdP 세션이 남아 있으면 로그인 화면 없이 바로 돌아온다. 끝났으면 Keycloak 로그인 폼이 보인다
  await page.getByRole('button', { name: '회사 계정으로 로그인' }).click();
  await page.waitForURL((url) => url.origin === KC);
  await expect(page.locator('#username')).toBeVisible();
});

test('Keycloak 에서 세션을 끊으면(백채널) 앱의 다음 요청이 401 이다', async ({ page }) => {
  await loginViaKeycloak(page, 'supplier', '/purchase');
  expect((await page.request.get('/api/proxy/scm-pp/mm/purchase-orders')).status()).toBe(200);
  await adminLogoutUser('supplier');
  await expect
    .poll(async () => (await page.request.get('/api/proxy/scm-pp/mm/purchase-orders')).status(), {
      timeout: 10_000,
    })
    .toBe(401);
});
