import { expect, test, type Page, type Route } from '@playwright/test';
import { sleep, visibleAlerts } from './helpers';

/**
 * 오류 분리 카드(ai/cards/2026-11-09_오류를_빈_데이터로_숨기는_fallback_제거.md) 5단계 브라우저 확인.
 * 목록 API 하나를 실패시키고, 빈 목록이 아니라 화면 문구 + 오류 종류 문구가 보이는지 본다.
 * 401 은 queryClient 카드 이후 로그인 화면으로 보낸다.
 */
type Scenario = 'network' | 'timeout' | '403' | '404' | '409' | '500' | 'shape';

const KIND_TEXT: Record<Scenario, string> = {
  network: '서버에 연결할 수 없습니다.',
  timeout: '서버 응답이 늦습니다.',
  '403': '이 데이터를 볼 권한이 없습니다.',
  '404': '요청한 데이터를 찾을 수 없습니다.',
  '409': '다른 사용자가 먼저 수정했습니다.',
  '500': '서버 오류가 발생했습니다.',
  shape: '서버 응답 형식이 예상과 다릅니다.',
};

const fail = async (route: Route, scenario: Scenario | '401') => {
  switch (scenario) {
    case 'network':
      return route.abort('connectionfailed');
    case 'timeout':
      await sleep(5_000); // axios 타임아웃 4초보다 길게
      return route.abort('timedout');
    case 'shape':
      return route.fulfill({ status: 200, json: { status: 200, success: true, message: 'OK' } });
    default: {
      const status = Number(scenario);
      return route.fulfill({ status, json: { status, success: false, message: `mock ${status}` } });
    }
  }
};

/** pathname 이 정확히 같은 GET 만 실패시킨다(상세나 하위 경로는 그대로) */
const failGet = (page: Page, pathname: string, scenario: Scenario | '401') =>
  page.route(
    (url) => url.pathname === pathname,
    (route) => (route.request().method() === 'GET' ? fail(route, scenario) : route.continue()),
  );

const SCREENS = [
  {
    name: '구매 발주 목록',
    url: '/purchase?tab=orders',
    api: '/api/proxy/scm-pp/mm/purchase-orders',
    screenText: '발주서 목록을 불러오는 중 오류가 발생했습니다.',
    emptyText: '발주서가 없습니다.',
  },
  {
    name: '구매 요청 목록',
    url: '/purchase?tab=requests',
    api: '/api/proxy/scm-pp/mm/purchase-requisitions',
    screenText: '구매 요청 목록을 불러오는 중 오류가 발생했습니다.',
    emptyText: '구매 요청 정보가 없습니다.',
  },
  {
    name: '인사 직원 목록',
    url: '/hrm',
    api: '/api/proxy/business/hrm/employee',
    screenText: '직원 정보를 불러오는 중 오류가 발생했습니다.',
    emptyText: '등록된 직원이 없습니다.',
  },
] as const;

const SCENARIOS: Scenario[] = ['network', 'timeout', '403', '404', '409', '500', 'shape'];

for (const screen of SCREENS) {
  test.describe(`${screen.name}: 실패는 오류로 보인다`, () => {
    for (const scenario of SCENARIOS) {
      test(scenario, async ({ page }) => {
        test.skip(
          scenario === 'timeout' && screen.name !== '구매 발주 목록',
          '타임아웃은 한 화면만',
        );
        await failGet(page, screen.api, scenario);
        await page.goto(screen.url);
        const alert = visibleAlerts(page).filter({ hasText: screen.screenText });
        // 5xx 와 network 는 재시도(1초, 2초) 뒤에 보인다
        await expect(alert).toBeVisible({ timeout: 20_000 });
        await expect(alert).toContainText(KIND_TEXT[scenario]);
        await expect(page.getByText(screen.emptyText)).toHaveCount(0);
      });
    }
  });
}

test('세션 만료(401)면 로그인 화면으로 가고 돌아올 경로를 들고 간다', async ({ page }) => {
  await failGet(page, '/api/proxy/scm-pp/mm/purchase-orders', '401');
  await page.goto('/purchase?tab=orders');
  await page.waitForURL(/\/login\?returnTo=/, { timeout: 20_000 });
  expect(decodeURIComponent(new URL(page.url()).searchParams.get('returnTo') ?? '')).toBe(
    '/purchase?tab=orders',
  );
});

const STAT_PAGES = [
  '/dashboard',
  '/sales',
  '/purchase',
  '/finance',
  '/hrm',
  '/production',
  '/inventory',
  '/warehouse',
  '/low-stock',
];

test.describe('통계 띠: 실패하면 0 값 대신 오류 한 줄', () => {
  for (const url of STAT_PAGES) {
    test(url, async ({ page }) => {
      // 통계 API 이름이 도메인마다 다르다(statistics, statistic, statictics, 고객 count)
      await page.route(
        (u) =>
          u.pathname.startsWith('/api/proxy/') &&
          /(statistic|statictics|customer\/count)/.test(u.pathname),
        (route) => fail(route, '500'),
      );
      await page.goto(url);
      const band = page.getByRole('region', { name: '지표' });
      await expect(band.getByRole('alert')).toContainText('지표를 불러오지 못했습니다.', {
        timeout: 20_000,
      });
      await expect(band.getByRole('definition')).toHaveCount(0);
    });
  }
});
