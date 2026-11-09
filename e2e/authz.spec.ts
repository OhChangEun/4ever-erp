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
