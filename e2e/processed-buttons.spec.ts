import { expect, test, type Page } from '@playwright/test';

/**
 * 이미 처리된 건의 버튼 카드(ai/cards/2026-11-12_이미_처리된_건의_버튼.md).
 * 서버 목이 처리 결과를 기억하므로, 처리한 건은 화면에서 다시 고를 수 없어야 한다.
 * 목 상태는 로그인별이다. 공유 관리자 세션을 쓰지 않고 새로 로그인해 처음 상태에서 시작하므로
 * 같은 서버에서 여러 번 돌려도 통과한다(e2e/mock-state.spec.ts 와 같은 방식).
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

test('재무 전표를 처리 요청하면 그 전표를 다시 요청할 수 없다', async ({ page }) => {
  await loginAs(page, 'ADMIN');
  await page.goto('/finance?tab=sales');

  const box = page.getByRole('checkbox', { name: 'AR-2026-001 선택' });
  await expect(box).toBeEnabled({ timeout: 30_000 });
  await box.check();
  const request = page.getByRole('button', { name: '미수 처리 신청' });
  await request.click();

  const row = page.getByRole('row', { name: /AR-2026-001/ });
  await expect(row.getByText('완납', { exact: true })).toBeVisible();
  await expect(box).toBeDisabled();
  await expect(box).not.toBeChecked();
  await expect(request).toBeDisabled();

  // 화면 캐시가 아니라 서버 목이 기억한다
  await page.reload();
  await expect(row.getByText('완납', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(box).toBeDisabled();
  await expect(request).toBeDisabled();
});

test('영업 견적을 즉시 납품하면 그 견적을 다시 고를 수 없다', async ({ page }) => {
  await loginAs(page, 'ADMIN');
  await page.goto('/sales');

  // 첫 쪽 맨 위의 대기 견적. 모터 A 40, 베어링 B 10 이라 재고(120, 20) 안이다(카드 "데모 데이터 채우기")
  const box = page.getByRole('checkbox', { name: 'QT-2026-016 선택' });
  await expect(box).toBeEnabled({ timeout: 30_000 });
  // 이미 승인된 견적은 처음부터 고를 수 없다
  await expect(page.getByRole('checkbox', { name: 'QT-2026-015 선택' })).toBeDisabled();
  await box.check();
  await page.getByRole('button', { name: '견적 검토 요청' }).click();

  const dialog = page.getByRole('dialog', { name: '견적 검토 요청' });
  await dialog.getByRole('button', { name: '재고 확인' }).click();
  const deliver = dialog.getByRole('button', { name: '즉시 납품 처리' });
  await deliver.click();
  await expect(page.getByText(/즉시 납품 처리가 완료되었습니다/)).toBeVisible();
  // 다시 받은 상세가 승인이라 같은 모달에서 버튼이 사라진다
  await expect(deliver).toHaveCount(0);
  await page.keyboard.press('Escape');

  await expect(box).toBeDisabled();
  await expect(box).not.toBeChecked();
  await expect(page.getByRole('button', { name: '견적 검토 요청' })).toBeDisabled();

  await page.reload();
  await expect(box).toBeDisabled({ timeout: 30_000 });
});
