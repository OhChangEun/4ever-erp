import { expect, test } from '@playwright/test';

/**
 * BOM 상태 변경의 낙관적 락. 서버가 409 를 주면 AppError kind conflict 로 판별해 충돌 다이얼로그를 띄운다.
 * (오류 분리 카드 완료 기준 6, 생산 mutation 카드에서 409 처리를 컴포넌트에 남김)
 */
test('BOM 상태 변경이 409 면 충돌 다이얼로그가 뜨고 최신 데이터를 다시 불러온다', async ({
  page,
}) => {
  let detailCalls = 0;
  await page.route(
    (u) => /^\/api\/proxy\/scm-pp\/pp\/boms\/[^/]+$/.test(u.pathname),
    async (route) => {
      const method = route.request().method();
      if (method === 'GET') detailCalls += 1;
      if (method === 'PATCH') {
        return route.fulfill({
          status: 409,
          json: { status: 409, success: false, message: '다른 사용자가 먼저 수정' },
        });
      }
      return route.continue();
    },
  );

  await page.goto('/production?tab=bom');
  await page.getByRole('button', { name: '상세' }).first().click();
  const toggle = page.getByRole('button', { name: /활성화$/ });
  await expect(toggle).toBeVisible({ timeout: 20_000 });
  const callsBefore = detailCalls;

  await toggle.click();
  await expect(page.getByText('수정 충돌이 발생했습니다')).toBeVisible();
  await expect(page.getByText('다른 사용자가 이미 이 BOM을 수정했습니다.')).toBeVisible();

  await page.getByRole('button', { name: '최신 데이터 불러오기' }).click();
  await expect(page.getByText('수정 충돌이 발생했습니다')).toHaveCount(0);
  await expect.poll(() => detailCalls).toBeGreaterThan(callsBefore);
});
