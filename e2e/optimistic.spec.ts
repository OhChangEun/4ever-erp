import { expect, test, type Page } from '@playwright/test';

/**
 * 낙관적 업데이트 바로잡기 카드(ai/cards/2026-11-09_낙관적_업데이트_바로잡기.md) 5단계 브라우저 확인.
 * 저장 요청을 붙잡아 두고 응답 전에 화면이 새 값으로 바뀌는지, 실패하면 원래 값으로 돌아가고
 * 입력이 남는지 본다. 서버 목은 고정 데이터라 성공 뒤 무효화가 다시 가져오면 화면은 서버 값으로 돌아간다.
 */

/**
 * 저장 요청을 붙잡아 두고, 테스트가 release() 를 부를 때 응답한다.
 * 시간 대신 신호로 풀어서 느린 환경에서도 "응답 전" 화면을 확실히 본다(리뷰 지적).
 */
const hold = async (
  page: Page,
  match: (url: URL, method: string) => boolean,
  status: 200 | 500,
) => {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => url.pathname.startsWith('/api/proxy/'),
    async (route) => {
      const request = route.request();
      if (!match(new URL(request.url()), request.method())) return route.continue();
      await released;
      return route.fulfill({
        status,
        json:
          status === 200
            ? { status: 200, success: true, message: 'OK', data: null }
            : { status: 500, success: false, message: 'mock 500' },
      });
    },
  );
  return { release };
};

test.describe('창고 수정', () => {
  const isEdit = (url: URL, method: string) =>
    method === 'PUT' && /^\/api\/proxy\/scm-pp\/iv\/warehouses\/[^/]+$/.test(url.pathname);

  // 창고 목록은 카드 형태다. 카드 제목이 창고 이름(정확히 일치)
  const openEdit = async (page: Page) => {
    await page.goto('/warehouse');
    await page.getByRole('button', { name: /관리$/ }).first().click();
    const name = page.locator('input[name="warehouseName"]');
    await expect(name).not.toHaveValue('', { timeout: 20_000 });
    const original = await name.inputValue();
    return { original, name };
  };
  const card = (page: Page, text: string) => page.getByText(text, { exact: true });

  test('응답 전에 목록 카드 이름이 바뀌고, 성공 뒤 모달이 닫히고 서버 값으로 맞춰진다', async ({
    page,
  }) => {
    const { release } = await hold(page, isEdit, 200);
    const { original, name } = await openEdit(page);
    await name.fill('E2E 창고');
    await page.getByRole('button', { name: /^저장/ }).click();

    await expect(card(page, 'E2E 창고')).toBeVisible();
    await expect(page.getByRole('button', { name: /저장 중/ })).toBeDisabled();
    release();

    await expect(page.getByText('창고 수정이 완료되었습니다.')).toBeVisible();
    await expect(name).toHaveCount(0);
    await expect(card(page, original).first()).toBeVisible();
  });

  test('실패하면 목록 카드가 원래 이름으로 돌아가고 모달과 입력은 남는다', async ({ page }) => {
    const { release } = await hold(page, isEdit, 500);
    const { original, name } = await openEdit(page);
    await name.fill('E2E 창고');
    await page.getByRole('button', { name: /^저장/ }).click();

    await expect(card(page, 'E2E 창고')).toBeVisible();
    release();

    await expect(page.getByText(/창고 수정 중 오류가 발생했습니다/)).toBeVisible();
    await expect(card(page, 'E2E 창고')).toHaveCount(0);
    await expect(card(page, original).first()).toBeVisible();
    await expect(name).toHaveValue('E2E 창고');
  });
});

test.describe('재고 상세의 안전재고와 재고 이동', () => {
  const openDetail = async (page: Page) => {
    await page.goto('/inventory');
    await page.getByRole('row').nth(1).getByRole('button', { name: /상세$/ }).click();
    await expect(page.getByText('안전 재고:', { exact: true })).toBeVisible({ timeout: 20_000 });
  };
  /** 상세 모달에서 라벨("현재 재고:") 옆 값의 숫자 */
  const valueOf = async (page: Page, label: string) => {
    const text = await page.getByText(`${label}:`, { exact: true }).locator('xpath=..').innerText();
    return Number(text.replace(/[^0-9]/g, ''));
  };

  test('안전재고 수정: 저장 버튼이 제출되고, 응답 전에 상세 값이 바뀐다', async ({ page }) => {
    const { release } = await hold(
      page,
      (url, method) => method === 'PATCH' && url.pathname.endsWith('/safety-stock'),
      200,
    );
    await openDetail(page);
    await page.getByRole('button', { name: /안전 재고 수정$/ }).click();
    await page.getByRole('spinbutton').fill('777');
    await page.getByRole('button', { name: /^수정/ }).click();

    await expect.poll(() => valueOf(page, '안전 재고')).toBe(777);
    release();
    await expect(page.getByText('안전재고가 수정되었습니다.')).toBeVisible();
  });

  test('재고 이동: 응답 전에 출발 창고의 현재고가 이동 수량만큼 준다', async ({ page }) => {
    const { release } = await hold(
      page,
      (url, method) => method === 'POST' && url.pathname.endsWith('/stock-transfers'),
      200,
    );
    await openDetail(page);
    const before = await valueOf(page, '현재 재고');
    await page.getByRole('button', { name: /재고 이동$/ }).click();
    const target = page.locator('select[name="toWarehouseId"]');
    await expect(target.locator('option')).not.toHaveCount(1, { timeout: 20_000 });
    await target.selectOption({ index: 1 });
    await page.locator('input[name="stockQuantity"]').fill('3');
    await page.getByRole('button', { name: /^이동/ }).click();

    await expect.poll(() => valueOf(page, '현재 재고')).toBe(before - 3);
    release();
    await expect(page.getByText('재고가 이동되었습니다.')).toBeVisible();
  });
});

test('프로필 수정: 실패하면 편집 폼과 입력이 남고 오류를 알린다', async ({ page }) => {
  const { release } = await hold(
    page,
    (url, method) => method === 'POST' && url.pathname.endsWith('/employees/profile/update'),
    500,
  );
  await page.goto('/profile');
  await page.getByRole('button', { name: /프로필 수정/ }).click();
  const address = page.getByLabel('주소');
  await address.fill('E2E 주소');
  await page.getByRole('button', { name: /^저장/ }).click();
  await expect(page.getByRole('button', { name: /저장 중/ })).toBeDisabled();
  release();

  await expect(page.getByText(/프로필 수정 중 오류가 발생했습니다/)).toBeVisible();
  // 롤백과 재조회가 지나간 뒤에도 입력이 남아 있어야 한다(effect 로 폼을 덮던 결함)
  await expect(address).toHaveValue('E2E 주소');
});

test('창고 등록(생성): 제출되면 모달이 닫히고 목록을 다시 가져온다', async ({ page }) => {
  let listCalls = 0;
  await page.route(
    (url) => url.pathname === '/api/proxy/scm-pp/iv/warehouses',
    async (route) => {
      if (route.request().method() === 'GET') listCalls += 1;
      return route.continue();
    },
  );
  await page.goto('/warehouse');
  await expect.poll(() => listCalls).toBeGreaterThan(0);
  const before = listCalls;
  await page.getByRole('button', { name: /창고 추가$/ }).click();
  await page.locator('input[name="warehouseName"]').fill('E2E 신규 창고');
  await page.locator('input[name="location"]').fill('부산');
  const manager = page.locator('select[name="manager"]');
  await expect(manager.locator('option')).not.toHaveCount(1, { timeout: 20_000 });
  await manager.selectOption({ index: 1 });
  await page.getByRole('button', { name: /새 창고 추가$/ }).click();

  await expect(page.getByText('창고 등록이 완료되었습니다.')).toBeVisible();
  await expect(page.locator('input[name="warehouseName"]')).toHaveCount(0);
  await expect.poll(() => listCalls).toBeGreaterThan(before);
});
