import { expect, test } from '@playwright/test';
import { visibleAlerts } from './helpers';

test('로그인 세션으로 대시보드가 뜨고 통계 띠가 보인다', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('region', { name: '지표' })).toBeVisible();
  await expect(page.getByText('총 매출')).toBeVisible();
  await expect(visibleAlerts(page)).toHaveCount(0);
});

test('매출 분석 탭은 열 때 차트 코드를 받아 그린다(성능 3, dynamic import)', async ({ page }) => {
  const chartChunks: string[] = [];
  page.on('response', (res) => {
    if (res.url().includes('/_next/static/chunks/')) chartChunks.push(res.url());
  });
  await page.goto('/sales');
  await expect(page.getByText('견적 관리', { exact: true }).first()).toBeVisible();
  const beforeTab = chartChunks.length;
  await page.getByText('매출 분석', { exact: true }).first().click();
  await expect(page.locator('.recharts-wrapper').first()).toBeVisible({ timeout: 20_000 });
  // 탭을 연 뒤에 청크를 더 받았다(첫 로드에 차트 코드가 없었다)
  expect(chartChunks.length).toBeGreaterThan(beforeTab);
  await expect(visibleAlerts(page)).toHaveCount(0);
});
