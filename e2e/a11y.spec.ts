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

test('axe 모달을 연 상태(창고 수정)와 키보드', async ({ page }) => {
  await page.goto('/warehouse');
  const trigger = page.getByRole('button', { name: /관리$/ }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('input[name="warehouseName"]')).not.toHaveValue('', {
    timeout: 20_000,
  });
  // 등장 페이드(150ms)가 도는 중엔 반투명이라 글자 대비가 낮게 잡힌다. 끝이 있는 애니메이션이 끝난 뒤 검사
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );
  const result = await scan(page);
  expect(summarize(result.violations)).toEqual([]);
  // 포커스는 모달 안, Esc 로 닫으면 연 버튼으로 돌아온다
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

// 리뷰 지적 P1: 모달 안 드롭다운 목록이 body 로 portal 되면 Radix 의 pointer-events: none 때문에 못 누른다
test('모달 안 드롭다운에서 항목을 고를 수 있다(교육 프로그램 추가)', async ({ page }) => {
  await page.goto('/hrm');
  await page.getByRole('button', { name: '교육관리' }).click();
  await page.getByRole('button', { name: '교육 프로그램 목록' }).click();
  await page.getByRole('button', { name: '프로그램 추가' }).click();
  const dialog = page.getByRole('dialog', { name: '프로그램 추가' });
  await dialog.getByRole('button', { name: /카테고리 선택/ }).click();
  const option = dialog.getByRole('listitem').first();
  const label = (await option.textContent())?.trim() ?? '';
  expect(label).not.toBe('');
  await option.click();
  await expect(dialog.getByRole('button', { name: label })).toBeVisible();
  await expect(dialog).toBeVisible();
});
