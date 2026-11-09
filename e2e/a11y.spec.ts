import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * 접근성 자동 점검(axe, WCAG 2.1 AA). 접근성 블록 카드.
 * 화면마다 첫 탭이 다 그려진 뒤 검사한다. 심각도 critical, serious 는 0 이어야 한다.
 */
const PAGES = [
  '/dashboard',
  '/purchase',
  '/sales',
  '/inventory',
  '/finance',
  '/hrm',
  '/production',
  '/warehouse',
  '/low-stock',
  '/profile',
];

const scan = async (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

const summarize = (violations: Awaited<ReturnType<typeof scan>>['violations']) =>
  violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`);

for (const path of PAGES) {
  test(`axe ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const result = await scan(page);
    expect(summarize(result.violations)).toEqual([]);
  });
}

test('axe 로그인 화면', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto('/login');
  const result = await scan(page);
  expect(summarize(result.violations)).toEqual([]);
  await context.close();
});
