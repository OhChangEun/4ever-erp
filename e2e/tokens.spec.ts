import { expect, test } from '@playwright/test';

/**
 * 디자인 토큰 카드. z-index 클래스(z-modal 등)가 실제 CSS 에서 토큰 값을 갖는다.
 * 예전엔 값이 :root 에만 있고 Tailwind 유틸리티가 없어 32곳의 클래스가 아무 일도 안 했다.
 */
const Z: Record<string, string> = {
  'z-local': '10',
  'z-header': '30',
  'z-sidebar': '40',
  'z-overlay': '50',
  'z-modal': '1000',
  'z-toast': '1100',
  'z-popover': '9999',
};

test('z-index 클래스가 토큰 값을 갖는다', async ({ page }) => {
  await page.goto('/dashboard');
  const computed = await page.evaluate((classes) => {
    const out: Record<string, string> = {};
    for (const cls of classes) {
      const el = document.createElement('div');
      el.className = `${cls} relative`;
      document.body.appendChild(el);
      out[cls] = getComputedStyle(el).zIndex;
      el.remove();
    }
    return out;
  }, Object.keys(Z));
  expect(computed).toEqual(Z);
});

test('브랜드 색 토큰이 Tailwind 기본값을 덮는다', async ({ page }) => {
  await page.goto('/dashboard');
  const blue = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-blue-500').trim(),
  );
  expect(blue.toLowerCase()).toBe('#2f4a7f');
});
