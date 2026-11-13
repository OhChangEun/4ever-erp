import { expect, test, type Page } from '@playwright/test';
import { waitForListLoaded } from './helpers';

/**
 * 지침 12장 "한 화면(툴바)에 primary 는 하나"(남은 접근성과 디자인 카드). 모달은 닫힌 상태로 본다.
 * primary = 브랜드 블루(`bg-blue-500`)로 채운 버튼. 비활성이어도 같은 남색 채움으로 보여 센다(design-rules 의 프로필 검사와 같다).
 * 지금 쪽 번호(`aria-current="page"`)는 누를 동작이 아니라 현재 위치 표시라 안 센다(지침의 "활성 탭" 과 같은 자리).
 * 링크도 primary 모양으로 칠하면 센다(`/unauthorized` 의 메인으로 이동). 달력에서 고른 날(`aria-selected` 칸 안)은 선택 표시라 안 센다.
 * 팝오버와 모달은 닫힌 상태가 전제다.
 */
const SCREENS = [
  '/dashboard',
  '/sales?tab=quotes',
  '/sales?tab=orders',
  '/sales?tab=customers',
  '/sales?tab=analytics',
  '/purchase?tab=requests',
  '/purchase?tab=orders',
  '/purchase?tab=suppliers',
  '/inventory?tab=inventory',
  '/inventory?tab=shipping',
  '/inventory?tab=receiving',
  '/finance?tab=sales',
  '/finance?tab=purchase',
  '/finance?tab=overview',
  '/hrm?tab=employee-management&subTab=employees',
  '/hrm?tab=employee-management&subTab=organization',
  '/hrm?tab=payroll-management',
  '/hrm?tab=attendance-management&subTab=attendance',
  '/hrm?tab=attendance-management&subTab=leave',
  '/hrm?tab=training-management&subTab=employeeTraining',
  '/hrm?tab=training-management&subTab=programs',
  '/production?tab=quotations',
  '/production?tab=mps',
  '/production?tab=mrp&subTab=requirements',
  '/production?tab=mrp&subTab=orders',
  '/production?tab=mes',
  '/production?tab=bom',
  '/warehouse',
  '/low-stock',
  '/profile',
  '/unauthorized',
];

/** 화면의 primary 글자 목록. main 이 없으면 body 를 본다 */
const primaries = (page: Page) =>
  page.evaluate(() => {
    const root = document.querySelector('main') ?? document.body;
    const probe = document.createElement('span');
    probe.className = 'bg-blue-500';
    document.body.append(probe);
    const brand = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return [...root.querySelectorAll('button, a')]
      .filter(
        (el) =>
          !el.closest('[role="dialog"], [role="listbox"], [role="menu"], [aria-selected="true"]') &&
          !el.hasAttribute('aria-current') &&
          el.getClientRects().length > 0 &&
          getComputedStyle(el).backgroundColor === brand,
      )
      .map((el) => (el.textContent ?? '').trim());
  });

for (const path of SCREENS) {
  test(`${path} 에 primary 버튼은 하나 이하`, async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 772 });
    await page.goto(path);
    await waitForListLoaded(page);
    await page.waitForLoadState('networkidle');
    const filled = await primaries(page);
    expect(filled.length, `primary: ${filled.join(', ')}`).toBeLessThanOrEqual(1);
  });
}

test('판정 고정: primary 로 칠한 링크는 세고 달력에서 고른 날은 안 센다', async ({ page }) => {
  await page.goto('/unauthorized');
  await expect(page.getByRole('link', { name: '메인으로 이동' })).toBeVisible();
  await page.evaluate(() => {
    const extra = document.createElement('div');
    extra.innerHTML =
      '<a href="#" class="bg-blue-500">링크</a>' +
      '<span role="gridcell" aria-selected="true"><button class="bg-blue-500">13</button></span>';
    (document.querySelector('main') ?? document.body).append(extra);
  });
  expect((await primaries(page)).sort()).toEqual(['링크', '메인으로 이동']);
});
