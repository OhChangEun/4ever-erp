import { expect, test, type Page } from '@playwright/test';
import { waitForListLoaded } from './helpers';

/**
 * 카드 "데모 데이터 채우기"(ai/cards/2026-11-13_데모_데이터_채우기.md). 서버 목(프록시 → `src/app/api/[...slug]`)으로
 * 목록이 2쪽 이상이고, 견적 재고 확인이 요청 수량을 보며, 즉시 납품으로 만든 주문 상세에 고객 주소와 담당자가 있는지 본다.
 * 즉시 납품은 목 상태를 바꾸므로 새로 로그인해 처음 상태에서 시작한다(e2e/processed-buttons.spec.ts 와 같은 방식).
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

test('직원 목록은 2쪽이 있고, 넘기면 1쪽에 없던 직원이 보인다', async ({ page }) => {
  await loginAs(page, 'ADMIN');
  await page.goto('/hrm');
  await waitForListLoaded(page);
  // 직원 42명, 번호순. 1쪽 첫 행은 홍길동, 2쪽 첫 행은 11번째 직원(구매팀 장하은)
  await expect(page.getByRole('row', { name: /홍길동/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('navigation').getByRole('button', { name: '2', exact: true }).click();
  await expect(page.getByRole('row', { name: /장하은/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /홍길동/ })).toHaveCount(0);
});

test('재고가 모자란 견적은 재고 확인 뒤 생산 검토로 안내하고 즉시 납품은 없다', async ({
  page,
}) => {
  await loginAs(page, 'ADMIN');
  await page.goto('/sales');
  // QT-2026-014: 모터 A 350(재고 120), 베어링 B 120(재고 20)
  const box = page.getByRole('checkbox', { name: 'QT-2026-014 선택' });
  await expect(box).toBeEnabled({ timeout: 30_000 });
  await box.check();
  await page.getByRole('button', { name: '견적 검토 요청' }).click();

  const dialog = page.getByRole('dialog', { name: '견적 검토 요청' });
  await dialog.getByRole('button', { name: '재고 확인' }).click();
  await expect(dialog.getByRole('link', { name: '생산관리에서 검토' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '즉시 납품 처리' })).toHaveCount(0);
  // 모자란 품목의 요청 수량과 재고가 그대로 보인다
  await expect(dialog.getByRole('row', { name: /모터 A/ })).toContainText('350');
  await expect(dialog.getByRole('row', { name: /모터 A/ })).toContainText('120');
});

test('즉시 납품으로 만든 대성기계 주문 상세에 주소와 담당자가 있다', async ({ page }) => {
  await loginAs(page, 'ADMIN');
  await page.goto('/sales');
  // QT-2026-016: 대성기계, 모터 A 40, 베어링 B 10(재고 안)
  const box = page.getByRole('checkbox', { name: 'QT-2026-016 선택' });
  await expect(box).toBeEnabled({ timeout: 30_000 });
  await box.check();
  await page.getByRole('button', { name: '견적 검토 요청' }).click();
  const dialog = page.getByRole('dialog', { name: '견적 검토 요청' });
  await dialog.getByRole('button', { name: '재고 확인' }).click();
  await dialog.getByRole('button', { name: '즉시 납품 처리' }).click();
  await expect(page.getByText(/즉시 납품 처리가 완료되었습니다/)).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/sales?tab=orders');
  await waitForListLoaded(page);
  // 오늘 만든 주문이라 최신순 맨 위
  const row = page.getByRole('row', { name: /SO-QT-2026-016/ });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole('button', { name: '상세' }).click();
  const detail = page.getByRole('dialog');
  await expect(detail.getByText('대성기계')).toBeVisible();
  await expect(detail.getByText(/경기도 안산시 단원구 산단로 55/)).toBeVisible();
  await expect(detail.getByText('이영업')).toBeVisible();
});
