import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForListLoaded } from './helpers';

/**
 * 게이트웨이가 역할로 막는 쓰기 버튼이 실제 화면에서 역할별로 보이고 숨는지 본다
 * (생산 버튼 권한 카드, 로그인 아이디와 생산 데모 계정 카드). 역할 목록은 src/lib/authz/policy.ts.
 * 관리자 세션 대신 데모 계정으로 새로 로그인한다.
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

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
/** 표의 첫 데이터 행(0 번은 머리 행) */
const firstRow = (page: Page) => page.getByRole('row').nth(1);

/** 화면을 열고 목록이 다 뜰 때까지 기다린다. "안 보임"은 로딩 중에도 참이라 데이터가 보인 뒤에 단언한다 */
const open = async (page: Page, url: string, loaded: Locator) => {
  await page.goto(url);
  await waitForListLoaded(page);
  await expect(loaded).toBeVisible({ timeout: 30_000 });
};

test('소문자 아이디 mm_admin 을 입력칸에 직접 쳐도 로그인된다', async ({ page }) => {
  await loginAs(page, 'mm_admin');
  await expect(page).toHaveURL(/\/dashboard/);
  const me = await page.request.get('/api/auth/me');
  expect(await me.json()).toMatchObject({ user: { role: 'MM_ADMIN' } });
});

test('생산 관리자(pp_admin): 시뮬레이션과 계획 주문 전환은 보이고 자재 구매 요청은 안 보인다', async ({
  page,
}) => {
  await loginAs(page, 'pp_admin');

  await open(page, '/production', firstRow(page));
  await expect(button(page, '시뮬레이션')).toBeVisible();

  await open(page, '/production?tab=mrp', firstRow(page));
  await expect(button(page, '계획 주문 전환')).toBeVisible();

  await open(page, '/production?tab=mrp&subTab=orders', firstRow(page));
  await expect(button(page, '자재 구매 요청')).toHaveCount(0);
});

test('구매 관리자(mm_admin): 구매 요청 승인과 반려, 선택 품목 발주는 보이고 시뮬레이션과 창고 추가는 안 보인다', async ({
  page,
}) => {
  await loginAs(page, 'mm_admin');

  await open(page, '/production', firstRow(page));
  await expect(button(page, '시뮬레이션')).toHaveCount(0);

  await open(page, '/purchase', firstRow(page));
  await expect(button(page, '승인').first()).toBeVisible();
  await expect(button(page, '반려').first()).toBeVisible();

  await open(page, '/low-stock', firstRow(page));
  await expect(button(page, '선택 품목 발주')).toBeVisible();

  await open(page, '/warehouse', button(page, '상세보기').first());
  await expect(button(page, '창고 추가')).toHaveCount(0);
});

test('재고 관리자(im_admin): 창고 추가는 보이고 선택 품목 발주와 구매 요청 승인은 안 보인다', async ({
  page,
}) => {
  await loginAs(page, 'im_admin');

  await open(page, '/warehouse', button(page, '상세보기').first());
  await expect(button(page, '창고 추가')).toBeVisible();

  await open(page, '/low-stock', firstRow(page));
  await expect(button(page, '선택 품목 발주')).toHaveCount(0);

  await open(page, '/purchase', firstRow(page));
  await expect(button(page, '승인')).toHaveCount(0);
});

test('전체 관리자(admin): 자재 구매 요청이 보인다(위 "안 보임" 단언과 같은 선택자)', async ({
  page,
}) => {
  await loginAs(page, 'admin');

  await open(page, '/production?tab=mrp&subTab=orders', firstRow(page));
  await expect(button(page, '자재 구매 요청')).toBeVisible();
});
