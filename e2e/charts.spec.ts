import { expect, test } from '@playwright/test';

/** 시각화 1: 통계 띠의 지표마다 스파크라인이 있다 */
test('대시보드 통계 띠에 스파크라인이 지표 수만큼 있다', async ({ page }) => {
  await page.goto('/dashboard');
  const strip = page.getByRole('region', { name: '지표' });
  await expect(strip.getByRole('img', { name: /추이/ }).first()).toBeVisible();
  const cards = await strip.locator('dt').count();
  await expect(strip.getByRole('img', { name: /추이/ })).toHaveCount(cards);
});

/** 시각화 2: 품목 상세의 재고 추이와 안전재고선, 표로 보기 */
test('재고 상세에 30일 추이, 안전재고, 소진 예상이 있고 표로 볼 수 있다', async ({ page }) => {
  await page.goto('/inventory');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '상세' }).first().click();
  const trend = page.getByRole('region', { name: '재고 추이(30일)' });
  await expect(trend).toContainText('안전재고 50');
  await expect(trend).toContainText(/약 \d+일 뒤 안전재고 아래/);
  await expect(trend.getByRole('img', { name: '재고 추이 차트' })).toBeVisible();
  await trend.getByRole('button', { name: '표로 보기' }).click();
  await expect(trend.getByRole('table', { name: '재고 추이 표' }).locator('tbody tr')).toHaveCount(
    30,
  );
});
