import { expect, test as setup } from '@playwright/test';

const STORAGE = 'e2e/.auth/admin.json';

/** 데모 관리자로 로그인해 세션 쿠키(httpOnly)를 저장한다. 로그인 화면을 실제로 거친다 */
setup('관리자 로그인', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox').first().fill('ADMIN');
  await page
    .getByRole('button', { name: /로그인/ })
    .last()
    .click();
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  await expect(page.getByRole('region', { name: '지표' })).toBeVisible({ timeout: 60_000 });
  await page.context().storageState({ path: STORAGE });
});
