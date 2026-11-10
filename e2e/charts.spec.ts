import { expect, test } from '@playwright/test';

/** 시각화 1: 통계 띠의 지표마다 스파크라인이 있다 */
test('대시보드 통계 띠에 스파크라인이 지표 수만큼 있다', async ({ page }) => {
  await page.goto('/dashboard');
  const strip = page.getByRole('region', { name: '지표' });
  await expect(strip.getByRole('img', { name: /추이/ }).first()).toBeVisible();
  const cards = await strip.locator('dt').count();
  await expect(strip.getByRole('img', { name: /추이/ })).toHaveCount(cards);
});
