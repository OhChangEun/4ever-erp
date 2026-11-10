import { expect, test } from '@playwright/test';

/** i18n 1: 프로필 메뉴에서 영어로 바꾸면 메뉴와 상태 글자가 영어가 되고, 새로고침해도 남는다 */
test('영어로 바꾸면 메뉴와 상태가 영어로, 새로고침 뒤에도 유지되고 다시 한국어로 돌린다', async ({
  page,
}) => {
  await page.goto('/purchase');
  await expect(page.getByRole('link', { name: '대시보드' })).toBeVisible();

  await page.getByRole('button', { name: /전체 관리자/ }).click();
  await page.getByRole('group', { name: '언어' }).getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Pending').first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: /전체 관리자/ }).click();
  await page
    .getByRole('group', { name: 'Language' })
    .getByRole('button', { name: '한국어' })
    .click();
  await expect(page.getByRole('link', { name: '대시보드' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
});

/** i18n 2: 재무 화면은 도메인 메시지로 탭, 목록, 재무 현황까지 영어가 된다(운영 빌드의 precompile 포함) */
test('영어로 바꾸면 재무 화면의 탭과 미수금 경과가 영어다', async ({ page }) => {
  await page.goto('/finance');
  await page.getByRole('button', { name: /전체 관리자/ }).click();
  await page.getByRole('group', { name: '언어' }).getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('button', { name: 'Sales invoices' })).toBeVisible();
  await page.getByRole('button', { name: 'Overview' }).click();
  await expect(page.getByRole('region', { name: 'Receivables aging' })).toBeVisible();

  // 다음 테스트를 위해 한국어로 되돌린다
  await page.getByRole('button', { name: /전체 관리자/ }).click();
  await page
    .getByRole('group', { name: 'Language' })
    .getByRole('button', { name: '한국어' })
    .click();
  await expect(page.getByRole('button', { name: '매출 전표 관리' })).toBeVisible();
});
