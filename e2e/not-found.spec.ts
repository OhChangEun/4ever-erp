import { expect, test, type Page } from '@playwright/test';
import { waitForListLoaded } from './helpers';

/**
 * 카드 "없는 건은 404"(ai/cards/2026-11-13_없는_건은_404.md). 서버 목(프록시 → `src/app/api/[...slug]`)이
 * 목록에 없는 id 의 상세에 404 를 주고, 상세 모달이 오류 안내를 보이며 다른 건 내용을 보이지 않는지,
 * 404 뒤 그 목록을 다시 받는지 본다. 화면에서는 목록에 없는 건을 열 길이 없어서(다른 사용자가 지운 경우)
 * 목록 행의 상세 요청 주소만 없는 id 로 바꿔 보낸다. 응답은 서버 목이 그대로 준다.
 */
const PROXY = '/api/proxy';

/** 목록 행 id 의 상세 요청을 없는 id(nope-1)로 바꿔 서버 목에 보낸다 */
const redirectDetailToMissing = (page: Page, list: string, id: string) =>
  page.route(
    (url) => url.pathname === `${PROXY}${list}/${id}`,
    (route) =>
      route.continue({ url: route.request().url().replace(`${list}/${id}`, `${list}/nope-1`) }),
  );

test('서버 목은 목록에 없는 id 의 상세에 404, 있는 id 에 200 을 준다', async ({ page }) => {
  for (const path of ['/business/sd/quotations', '/scm-pp/pp/mes']) {
    const missing = await page.request.get(`${PROXY}${path}/nope-1`);
    expect(missing.status()).toBe(404);
    expect(await missing.json()).toEqual({
      status: 404,
      success: false,
      message: expect.any(String),
    });
  }
  expect((await page.request.get(`${PROXY}/business/sd/quotations/qt-001`)).status()).toBe(200);
  expect((await page.request.get(`${PROXY}/scm-pp/pp/mes/mes-001`)).status()).toBe(200);
});

test('견적 상세가 404 면 오류 안내만 보이고 견적 목록을 다시 받는다', async ({ page }) => {
  await redirectDetailToMissing(page, '/business/sd/quotations', 'qt-002');
  await page.goto('/sales?tab=quotes');
  await waitForListLoaded(page);
  const row = page.getByRole('row', { name: /QT-2026-002/ });
  await expect(row).toBeVisible();

  const listRefetch = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === `${PROXY}/business/sd/quotations` &&
      request.method() === 'GET',
  );
  await row.getByRole('button', { name: '상세' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('견적서를 불러오는 중 오류가 발생했습니다.')).toBeVisible();
  await expect(dialog.getByText('대성기계')).toHaveCount(0);
  await expect(dialog.getByText('한빛전자')).toHaveCount(0);
  await listRefetch;
});

test('MES 상세가 404 면 오류 안내와 닫기만 보이고 닫기는 모달을 닫는다', async ({ page }) => {
  await redirectDetailToMissing(page, '/scm-pp/pp/mes', 'mes-001');
  await page.goto('/production?tab=mes');
  await waitForListLoaded(page);

  const listRefetch = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === `${PROXY}/scm-pp/pp/mes` && request.method() === 'GET',
  );
  await page.getByRole('row').nth(1).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('데이터를 불러오는 데 실패했습니다.')).toBeVisible();
  await expect(dialog.getByText(/작업지시/)).toHaveCount(0);
  await listRefetch;
  // 모달 머리의 X 도 이름이 "닫기"다. 오류 상자의 글자 버튼을 누른다
  await dialog.getByText('닫기', { exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
