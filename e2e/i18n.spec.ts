import { expect, test } from '@playwright/test';
import { chromeHangul } from '../src/test/chromeHangul';

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

/** ui 문구 카드: @everp/ui 가 스스로 그리는 글자(쪽 넘김 이름과 버튼, 총 건수, 검색 타입)도 영어다(운영 빌드의 precompile 포함) */
test('영어로 바꾸면 공통 UI 패키지의 쪽 넘김과 검색 막대도 영어다', async ({ page }) => {
  await page.goto('/purchase');
  const koNav = page.getByRole('navigation', { name: '페이지' });
  await expect(koNav).toContainText(/총 \d+건/);

  await page.getByRole('button', { name: /전체 관리자/ }).click();
  await page.getByRole('group', { name: '언어' }).getByRole('button', { name: 'English' }).click();
  const nav = page.getByRole('navigation', { name: 'Pagination' });
  await expect(nav).toContainText(/Total \d+/);
  await expect(nav.getByRole('button', { name: 'Previous page' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Next page' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search type' })).toBeVisible();

  // 새로고침 뒤에도 영어(열린 프로필 메뉴도 닫힌다)
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText(/Total \d+/);

  // 다음 테스트를 위해 한국어로 되돌린다
  await page.getByRole('button', { name: /전체 관리자/ }).click();
  await page
    .getByRole('group', { name: 'Language' })
    .getByRole('button', { name: '한국어' })
    .click();
  await expect(page.getByRole('navigation', { name: '페이지' })).toContainText(/총 \d+건/);
});

/**
 * 남은 한국어 문자열 카드: 영어로 바꾸면 비공개 화면과 그 탭 전부에서 화면이 그린 글자(표 머리, 버튼, 탭, 제목, 라벨,
 * 입력 안내, 접근성 이름)에 한글이 없다. 서버 데이터(품목, 고객사 이름)를 빼는 규칙은 src/test/chromeHangul.ts
 */
test('영어로 바꾸면 비공개 화면과 탭 전부에서 화면이 그린 글자에 한글이 없다', async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }]);
  const routes = [
    '/dashboard',
    '/sales',
    '/purchase',
    '/production',
    '/inventory',
    '/low-stock',
    '/warehouse',
    '/finance',
    '/hrm',
    '/profile',
  ];
  const found: Record<string, string[]> = {};
  const collect = async (where: string) => {
    await page.waitForLoadState('networkidle');
    // 가장 안쪽 main 이 화면 본문이다(프로필은 바깥 main 에 사이드바가 같이 있다)
    const hangul = await page.locator('main:not(:has(main))').first().evaluate(chromeHangul);
    if (hangul.length > 0) found[where] = hangul;
  };

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await collect(route);
    // 탭 바(TabNavigation)가 있는 화면은 탭마다 본다
    const tabs = page.getByRole('navigation', { name: / tabs$/ }).getByRole('button');
    const names = await tabs.allTextContents();
    for (const name of names.slice(1)) {
      await tabs.filter({ hasText: name }).first().click();
      await expect(page.getByRole('region', { name })).toBeVisible();
      await collect(`${route} > ${name}`);
    }
  }
  expect(found).toEqual({});
});
