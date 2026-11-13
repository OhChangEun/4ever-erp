import { expect, test, type Page } from '@playwright/test';
import { waitForListLoaded } from './helpers';

/**
 * 카드 "목 필터와 검색"(ai/cards/2026-11-13_목_필터와_검색.md). 서버 목(프록시 → `src/app/api/[...slug]`)이
 * 구매 요청 목록의 상태 필터와 검색어를 실제로 거르는지 본다. 쓰기가 없어 저장된 관리자 세션을 그대로 쓴다.
 */
const dataRows = (page: Page) => page.locator('tbody tr');

test('구매 요청: 상태 "승인"을 고르면 승인 행만, 요청자 검색을 더하면 그 사람의 승인 건만, 전체로 되돌리면 다시 전부', async ({
  page,
}) => {
  await page.goto('/purchase');
  await waitForListLoaded(page);
  // 첫 쪽에는 대기와 승인이 섞여 있다(기본 15건, 최신순)
  await expect(page.getByRole('row', { name: /PR-2026-015/ })).toBeVisible({ timeout: 30_000 });
  await expect(dataRows(page).filter({ hasText: '대기' }).first()).toBeVisible();

  await page.getByRole('combobox', { name: '전체 상태' }).click();
  await page.getByRole('option', { name: '승인', exact: true }).click();

  // 다시 받은 목록의 모든 행이 승인이다
  await expect(page.getByRole('row', { name: /PR-2026-015/ })).toHaveCount(0);
  await expect(async () => {
    const statuses = await dataRows(page).allTextContents();
    expect(statuses.length).toBeGreaterThan(0);
    for (const text of statuses) {
      expect(text).toContain('승인');
      expect(text).not.toContain('대기');
      expect(text).not.toContain('반려');
    }
  }).toPass({ timeout: 15_000 });

  // 검색 타입을 요청자로 두고 이름 일부를 넣는다. 윤지호의 승인 건은 PR-2026-002 하나다
  await page.getByRole('combobox', { name: '검색 타입' }).click();
  await page.getByRole('option', { name: '요청자', exact: true }).click();
  await page.getByPlaceholder('검색어를 입력하세요').fill('윤지');
  await expect(async () => {
    const rows = await dataRows(page).allTextContents();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('PR-2026-002');
    expect(rows[0]).toContain('윤지호');
    expect(rows[0]).toContain('승인');
  }).toPass({ timeout: 15_000 });

  // 검색어를 지우고 상태를 전체로 되돌리면 대기 건이 다시 보인다(예전엔 전체 항목이 없어 되돌릴 수 없었다)
  await page.getByPlaceholder('검색어를 입력하세요').fill('');
  await page.getByRole('combobox', { name: '전체 상태' }).click();
  await page.getByRole('option', { name: '전체', exact: true }).click();
  await expect(page.getByRole('row', { name: /PR-2026-015/ })).toBeVisible({ timeout: 15_000 });
  await expect(dataRows(page).filter({ hasText: '대기' }).first()).toBeVisible();
  await expect(dataRows(page).filter({ hasText: '반려' }).first()).toBeVisible();
});
