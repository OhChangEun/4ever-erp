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
