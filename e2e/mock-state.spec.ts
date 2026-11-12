import { expect, test, type Page } from '@playwright/test';

/**
 * 목이 쓰기 결과를 따르게 카드(ai/cards/2026-11-12_목이_쓰기_결과를_따르게.md).
 * 서버 목이 반려를 기억해, 다시 받은 목록이 바뀐 상태로 오는지 본다.
 * 목 상태는 로그인(세션 토큰)별이다(src/mocks/state.ts). 공유 관리자 세션을 쓰지 않고 새로 로그인해
 * 처음 상태에서 시작하므로, 같은 서버에서 여러 번 돌려도 통과한다.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const loginAs = async (page: Page, loginId: string) => {
  await page.goto('/login');
  await page.getByRole('textbox').first().fill(loginId);
  await page
    .getByRole('button', { name: /로그인/ })
    .last()
    .click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 });
};

test('관리자가 구매 요청을 반려하면 그 행이 반려로 바뀌고, 새로고침해도 그대로다', async ({
  page,
}) => {
  await loginAs(page, 'ADMIN');
  await page.goto('/purchase');

  const row = page.getByRole('row', { name: /PR-2026-001/ });
  await expect(row.getByText('대기', { exact: true })).toBeVisible({ timeout: 30_000 });

  await row.getByRole('button', { name: '반려' }).click();
  const dialog = page.getByRole('dialog', { name: '해당 요청을 반려하시겠습니까?' });
  await dialog.getByRole('textbox', { name: '반려 사유' }).fill('예산 초과');
  await dialog.getByRole('button', { name: '확인' }).click();

  await expect(page.getByText('반려 처리되었습니다.')).toBeVisible();
  await expect(row.getByText('반려', { exact: true })).toBeVisible();
  // 이미 반려한 요청은 다시 승인하거나 반려할 수 없다
  await expect(row.getByRole('button', { name: '반려' })).toHaveCount(0);
  await expect(row.getByRole('button', { name: '승인' })).toHaveCount(0);

  // 화면 캐시가 아니라 서버 목이 기억한다
  await page.reload();
  await expect(row.getByText('반려', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(row.getByText('대기', { exact: true })).toHaveCount(0);
});
