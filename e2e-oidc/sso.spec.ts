import { expect, test, type Page } from '@playwright/test';
import { oidcEnv } from './env';

/**
 * SSO 포털(계획 16-1 "SSO 두 번째 클라이언트", 결정 29). erp(3100)와 포털(3300)은 같은 Keycloak realm 의
 * 다른 클라이언트다. 확인하는 것:
 * 1. erp 에 로그인하면 포털은 로그인 폼 없이 열린다(Keycloak SSO 세션).
 * 2. 한쪽에서 로그아웃하면 Keycloak 이 다른 쪽에 백채널로 알려 그쪽 세션도 끝난다.
 * 3. 포털이 받지 않는 역할은 거절한다.
 */
const OIDC = oidcEnv();
const PASSWORD = OIDC.E2E_OIDC_PASSWORD ?? '';
const KC = new URL(OIDC.OIDC_ISSUER ?? '').origin;
const PORTAL = 'http://localhost:3300';

const loginErp = async (page: Page, username: string, returnTo: string) => {
  await page.goto(returnTo);
  await page.waitForURL(/\/login/);
  await page.getByRole('button', { name: '회사 계정으로 로그인' }).click();
  await page.waitForURL((url) => url.origin === KC, { timeout: 30_000 });
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => url.pathname.startsWith(returnTo), { timeout: 60_000 });
};

/** 포털로 가면서 Keycloak 로그인 폼이 한 번이라도 떴는지 센다 */
const openPortal = async (page: Page, path: string) => {
  let sawLoginForm = false;
  const onNav = () => {
    void page
      .locator('#username')
      .isVisible()
      .then((visible) => {
        if (visible) sawLoginForm = true;
      })
      .catch(() => {});
  };
  page.on('framenavigated', onNav);
  await page.goto(`${PORTAL}${path}`);
  await page.waitForURL((url) => url.origin === PORTAL && url.pathname === path, {
    timeout: 60_000,
  });
  page.off('framenavigated', onNav);
  return { sawLoginForm };
};

test('erp 에 로그인하면 포털은 로그인 폼 없이 열리고 공급사 화면만 보인다(SSO)', async ({
  page,
}) => {
  await loginErp(page, 'supplier', '/purchase');
  const { sawLoginForm } = await openPortal(page, '/orders');
  expect(sawLoginForm).toBe(false);
  await expect(page.getByTestId('who')).toContainText('공급사');
  await expect(page.getByRole('table', { name: '받은 발주 표' })).toBeVisible();
  await expect(page.getByRole('table', { name: '내 주문 표' })).toHaveCount(0);
  // 포털 쿠키는 erp 쿠키와 이름이 달라 같은 localhost 에서 서로 덮지 않는다
  const names = (await page.context().cookies('http://localhost')).map((c) => c.name);
  expect(names).toEqual(expect.arrayContaining(['session', 'portal_session']));
});

test('erp 에서 로그아웃하면 포털 세션도 끝난다(Keycloak 백채널)', async ({ page }) => {
  await loginErp(page, 'supplier', '/purchase');
  await openPortal(page, '/');
  expect((await page.request.get(`${PORTAL}/api/auth/me`)).status()).toBe(200);

  await page.goto('/purchase');
  // Keycloak 로그아웃 응답까지 기다린다. /login 으로 가는 앞쪽 이동만 보고 넘어가면 다음 page.goto 가
  // 브라우저의 Keycloak 로그아웃 요청을 끊어 IdP 세션이 남는다(처음 돌렸을 때 실제로 남았다)
  const idpLogout = page.waitForResponse(
    (r) => r.url().startsWith(KC) && r.url().includes('/protocol/openid-connect/logout'),
  );
  await page.getByRole('button', { name: /EverP/ }).click();
  await page.getByText('로그아웃').first().click();
  await idpLogout;
  await page.waitForURL(/\/login/, { timeout: 30_000 });

  await expect
    .poll(async () => (await page.request.get(`${PORTAL}/api/auth/me`)).status(), {
      timeout: 15_000,
    })
    .toBe(401);
  // Keycloak 세션도 끝나 포털은 다시 로그인 폼을 보인다
  await page.goto(PORTAL);
  await page.waitForURL((url) => url.origin === KC, { timeout: 30_000 });
  await expect(page.locator('#username')).toBeVisible();
});

test('포털에서 로그아웃하면 erp 세션도 끝난다', async ({ page }) => {
  await loginErp(page, 'supplier', '/purchase');
  await openPortal(page, '/');
  await page.getByRole('button', { name: '로그아웃' }).click();
  await page.waitForURL(`${PORTAL}/signed-out`, { timeout: 30_000 });
  await expect(page.getByText('로그아웃했습니다.')).toBeVisible();
  await expect
    .poll(async () => (await page.request.get('/api/auth/me')).status(), { timeout: 15_000 })
    .toBe(401);
});

test('포털이 받지 않는 역할(재무 관리자)은 거절한다', async ({ page }) => {
  await loginErp(page, 'fcm_admin', '/finance');
  await page.goto(PORTAL);
  await page.waitForURL(/\/signed-out\?error=no_role/, { timeout: 60_000 });
  // role=alert 는 Next 의 라우트 안내 요소에도 있어 문구로 찾는다
  await expect(page.getByText(/이 계정은 포털을 쓸 수 없습니다/)).toBeVisible();
});

/** 포털 화면 접근성(axe, WCAG 2.1 AA). erp 와 같은 기준: critical, serious 0 */
test('포털 홈, 주문, 로그아웃 화면에 axe critical, serious 위반이 없다', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const scan = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    return result.violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious')
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  };
  await loginErp(page, 'supplier', '/purchase');
  await openPortal(page, '/');
  expect(await scan()).toEqual([]);
  await openPortal(page, '/orders');
  expect(await scan()).toEqual([]);
  await page.goto(`${PORTAL}/signed-out`);
  expect(await scan()).toEqual([]);
});
