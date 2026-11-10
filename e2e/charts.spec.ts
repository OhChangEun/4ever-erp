import { expect, test } from '@playwright/test';

/** 시각화 1: 통계 띠의 지표마다 스파크라인이 있다 */
test('대시보드 통계 띠에 스파크라인이 지표 수만큼 있다', async ({ page }) => {
  await page.goto('/dashboard');
  const strip = page.getByRole('region', { name: '지표' });
  await expect(strip.getByRole('img', { name: /추이/ }).first()).toBeVisible();
  const cards = await strip.locator('dt').count();
  await expect(strip.getByRole('img', { name: /추이/ })).toHaveCount(cards);
});

/** 시각화 2: 품목 상세의 재고 추이와 안전재고선, 표로 보기 */
test('재고 상세에 30일 추이, 안전재고, 소진 예상이 있고 표로 볼 수 있다', async ({ page }) => {
  await page.goto('/inventory');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '상세' }).first().click();
  const trend = page.getByRole('region', { name: '재고 추이(30일)' });
  await expect(trend).toContainText('안전재고 50');
  await expect(trend).toContainText(/약 \d+일 뒤 안전재고 아래/);
  await expect(trend.getByRole('img', { name: '재고 추이 차트' })).toBeVisible();
  await trend.getByRole('button', { name: '표로 보기' }).click();
  await expect(trend.getByRole('table', { name: '재고 추이 표' }).locator('tbody tr')).toHaveCount(
    30,
  );
});

/** 시각화 3: MES 간트. 키보드로 막대를 옮기고 Enter 로 상세를 연다 */
test('MES 간트에서 막대를 키보드로 옮기고 Enter 로 상세를 연다', async ({ page }) => {
  await page.goto('/production');
  await page.getByRole('button', { name: 'MES' }).first().click();
  await page.getByRole('button', { name: '간트' }).click();
  const list = page.getByRole('list', { name: 'MES 작업 일정(간트)' });
  const bars = list.getByRole('listitem');
  await expect(bars.first()).toBeVisible();
  expect(await bars.count()).toBeGreaterThan(1);
  await expect(list.getByRole('listitem', { name: /지연/ }).first()).toBeVisible();
  await bars.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(bars.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'MES 현황' })).toBeVisible();
});

/** 시각화 4: 재무 현황 탭의 월별 복합 차트와 미수금 경과 */
test('재무 현황에 월별 매출, 매입 차트와 미수금 경과 표가 있다', async ({ page }) => {
  await page.goto('/finance');
  await page.getByRole('button', { name: '재무 현황' }).first().click();
  const monthly = page.getByRole('region', { name: '월별 매출과 매입' });
  await expect(monthly.getByRole('img', { name: '월별 매출과 매입 차트' })).toBeVisible();
  await expect(monthly.locator('.recharts-bar-rectangle').first()).toBeVisible();
  await expect(monthly).toContainText(/적자 1개월/);
  await monthly.getByRole('button', { name: '표로 보기' }).click();
  await expect(
    monthly.getByRole('table', { name: '월별 매출과 매입 표' }).locator('tbody tr'),
  ).toHaveCount(12);
  const aging = page.getByRole('region', { name: '미수금 경과' });
  await expect(aging).toContainText(/기한 지난 금액 ₩100,700,000\(36%\)/);
  await expect(
    aging.getByRole('table', { name: '미수금 경과 표' }).locator('tbody tr'),
  ).toHaveCount(5);
});

/** 시각화 5: 근태 잔디. 가장 많은 날을 누르면 아래 목록이 그날로 바뀐다 */
test('근태 잔디에서 가장 많은 날을 누르면 그날 출퇴근 기록을 받는다', async ({ page }) => {
  await page.goto('/hrm');
  await page.getByRole('button', { name: '근태관리' }).click();
  const heat = page.getByRole('region', { name: '근태 잔디' });
  await expect(heat.getByRole('img', { name: '근태 이상 잔디(12주)' })).toBeVisible();
  await expect(heat).toContainText(/하루 평균 [\d.]+건/);
  const worst = heat.getByRole('button').first();
  const date = (await worst.textContent())?.trim() ?? '';
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const request = page.waitForRequest(
    (r) => r.url().includes('/time-record') && r.url().includes(`date=${date}`),
  );
  await worst.click();
  await request;
  await expect(heat.locator(`rect[data-date="${date}"]`)).toHaveAttribute('data-selected', 'true');
});

/** 시각화 6: 대시보드 자재 흐름 Sankey. 운영 역할(관리자)에게 보이고 표로 볼 수 있다 */
test('대시보드에 이번 달 자재 흐름 Sankey 와 새는 금액이 있다', async ({ page }) => {
  await page.goto('/dashboard');
  const flow = page.getByRole('region', { name: '이번 달 자재 흐름(금액)' });
  await expect(flow.getByRole('img', { name: '자재 흐름 차트' })).toBeVisible();
  await expect(flow.locator('.recharts-sankey-nodes rect').first()).toBeVisible();
  await expect(flow).toContainText(/새는 금액\(반려, 입고 대기\) ₩180,000,000\(시작 금액의 15%\)/);
  await flow.getByRole('button', { name: '표로 보기' }).click();
  await expect(flow.getByRole('table', { name: '자재 흐름 표' }).locator('tbody tr')).toHaveCount(
    9,
  );
});

/** 시각화 7: BOM 상세의 원가 트리. 단가 없는 자재는 "이상"으로, 노드는 키보드로 접는다 */
test('BOM 원가 트리에 완제품 원가(이상)가 있고 조립품을 키보드로 접는다', async ({ page }) => {
  await page.goto('/production?tab=bom');
  await page.getByRole('button', { name: '상세' }).first().click();
  const tree = page.getByRole('group', { name: 'BOM 원가 트리' });
  await expect(tree).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/완제품 1개 자재 원가 ₩47,360 이상/)).toBeVisible();
  await expect(page.getByText(/단가 없는 자재 1개는 0 원으로 세지 않았습니다/)).toBeVisible();
  const rotor = tree.getByRole('button', { name: /^로터 조립/ });
  await rotor.focus();
  await page.keyboard.press('Enter');
  await expect(rotor).toHaveAttribute('aria-expanded', 'false');
  await expect(tree.getByText('하위 3개 접힘', { exact: true })).toBeVisible();
});

/** 시각화 8: 창고 3D 는 실제 재고를 재고율 색으로 그리고, 목록에서 고른 품목의 재고 상세를 연다 */
test('창고 3D 에 재고율 목록이 있고 고른 품목의 재고 상세를 연다', async ({ page }) => {
  await page.goto('/warehouse');
  await page.getByRole('button', { name: '3D' }).first().click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 });
  const list = page.getByRole('list', { name: '품목(재고율 낮은 순)' });
  await expect(list.getByRole('button')).toHaveCount(14);
  await expect(page.getByText(/품목 14개 중 부족 4개/)).toBeVisible();
  const first = list.getByRole('button').first();
  await expect(first).toContainText('부족');
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '재고 상세 열기' }).click();
  await expect(page.getByRole('dialog', { name: '재고 상세' })).toBeVisible();
});
