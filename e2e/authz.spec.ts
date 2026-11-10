import { expect, test, type Page } from '@playwright/test';

/**
 * 인가 표(src/lib/authz/policy.ts)를 페이지 프록시가 실제로 쓰는지 본다(인증 2단계 카드).
 * 관리자 세션 대신 데모 계정으로 새로 로그인한다.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const loginAs = async (page: Page, loginId: string) => {
  await page.goto('/login');
  await page.getByRole('textbox').first().fill(loginId);
  await page
    .getByRole('button', { name: /로그인/ })
    .last()
    .click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 });
};

test('공급사는 창고 화면 대신 권한 없음 화면으로 간다', async ({ page }) => {
  await loginAs(page, 'SUPPLIER');
  await page.goto('/warehouse');
  await page.waitForURL(/\/unauthorized/, { timeout: 30_000 });
});

test('공급사도 구매 화면은 열린다(표에 SUPPLIER_ADMIN 있음)', async ({ page }) => {
  await loginAs(page, 'SUPPLIER');
  await page.goto('/purchase');
  await expect(page).toHaveURL(/\/purchase/);
});

test('재무 관리자는 인사 API 를 직접 불러도 403', async ({ page }) => {
  await loginAs(page, 'FCM_ADMIN');
  const res = await page.request.get('/api/proxy/business/hrm/employee');
  expect(res.status()).toBe(403);
});

test('로그아웃하면 세션 쿠키가 실제로 지워지고 다음 요청은 401(운영 빌드의 __Host- 쿠키 포함)', async ({
  page,
  context,
}) => {
  await loginAs(page, 'ADMIN');
  const before = (await context.cookies()).map((c) => c.name);
  expect(before.some((name) => name.endsWith('session'))).toBe(true);

  // 화면의 로그아웃과 같은 요청(같은 출처 POST). 페이지 안 fetch 로 보내면, 세션이 지워진 뒤 열린 화면의 다른 요청이
  // 401 을 받아 로그인으로 이동하면서 evaluate 의 실행 맥락이 사라져 가끔 실패했다(전체 실행에서 두 번).
  // 쿠키를 같이 쓰는 page.request 로 보낸다. Origin 은 서버의 같은 출처 검사 때문에 붙인다
  const origin = new URL(page.url()).origin;
  const logout = await page.request.post('/api/auth/logout', { headers: { origin } });
  expect(logout.ok()).toBe(true);

  const after = (await context.cookies()).map((c) => c.name);
  expect(after.some((name) => name.endsWith('session'))).toBe(false);
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  // 페이지 이동 대신 서버 응답을 본다. 열려 있던 화면의 클라이언트 가드가 /login 으로 옮기는 이동과
  // page.goto 가 부딪혀 흔들렸다(CI 에서 한 번 실패)
  const dashboard = await page.request.get('/dashboard', { maxRedirects: 0 });
  expect(dashboard.status()).toBe(307);
  expect(dashboard.headers()['location']).toContain('/login');
});
