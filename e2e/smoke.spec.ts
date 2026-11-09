import { expect, test } from '@playwright/test';
import { visibleAlerts } from './helpers';

test('로그인 세션으로 대시보드가 뜨고 통계 띠가 보인다', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('region', { name: '지표' })).toBeVisible();
  await expect(page.getByText('총 매출')).toBeVisible();
  await expect(visibleAlerts(page)).toHaveCount(0);
});
