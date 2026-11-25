import { expect, test, type Page, type Request } from '@playwright/test';

/**
 * 카드 "화면끼리 캐시"(ai/cards/2026-11-24_화면끼리_캐시.md). 도메인 레이아웃마다 QueryClient 가 따로라(`_RouteProviders.tsx`)
 * 도메인에 들어갈 때마다 서버 값을 다시 받는다. 다른 도메인 키를 무효화하지 않아도 그 화면이 맞는지,
 * 로그아웃한 사람의 값이 남지 않는지를 화면 안의 링크로만 옮기며(새로고침 없음) staleTime 30초 안에서 본다.
 * 목 상태는 로그인별이라 새로 로그인해 처음 상태에서 시작한다(e2e/mock-state.spec.ts 와 같은 방식).
 */
test.use({ storageState: { cookies: [], origins: [] } });

const STALE_TIME_MS = 30_000;

/** 로그인 화면에 있을 때 들어간다. `page.goto` 는 처음 한 번만 쓴다(JS 메모리를 지우면 검사가 뜻을 잃는다) */
const signIn = async (page: Page, loginId: string) => {
  await page.getByRole('textbox').first().fill(loginId);
  await page
    .getByRole('button', { name: /로그인/ })
    .last()
    .click();
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
};
const loginAs = async (page: Page, loginId: string) => {
  await page.goto('/login');
  await signIn(page, loginId);
};

/** 사이드바 링크로 옮긴다 */
const goTo = async (page: Page, menu: string, path: string) => {
  await page.getByRole('complementary').getByRole('link', { name: menu }).click();
  await page.waitForURL((url) => url.pathname === path);
};
const dashboard = (page: Page) => goTo(page, '대시보드', '/dashboard');
const sales = (page: Page) => goTo(page, '영업관리', '/sales');
const production = (page: Page) => goTo(page, '생산관리', '/production');
const purchase = (page: Page) => goTo(page, '구매관리', '/purchase');
const inventory = (page: Page) => goTo(page, '재고관리', '/inventory');
const finance = (page: Page) => goTo(page, '재무관리', '/finance');

const openTab = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click();
const firstRow = (page: Page) => page.getByRole('row').nth(1);

/** `path` 로 끝나는 GET 의 쿼리 문자열. 쿼리 문자열이 달라도 같은 목록으로 센다 */
const listRequests = (page: Page, path: string) => {
  const seen: string[] = [];
  page.on('request', (request: Request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === `/api/proxy/${path}`) seen.push(url.search);
  });
  return seen;
};

/** API 요청이 1초 동안 새로 없을 때까지. 자동 선택과 검색 디바운스(200ms) 뒤의 두 번째 요청까지 기다린다 */
const settled = async (page: Page) => {
  let last = Date.now();
  const onRequest = (request: Request) => {
    if (request.url().includes('/api/proxy/')) last = Date.now();
  };
  page.on('request', onRequest);
  await expect.poll(() => Date.now() - last, { timeout: 15_000 }).toBeGreaterThan(1_000);
  page.off('request', onRequest);
};

/** `work` 를 하는 동안 새로고침이 없었고(JS 메모리가 남았고) 30초가 안 지났는지 본다 */
const withinStaleTime = async (page: Page, work: () => Promise<void>) => {
  await page.evaluate(() => Object.assign(window, { sameDocument: true }));
  const startedAt = Date.now();
  await work();
  expect(Date.now() - startedAt).toBeLessThan(STALE_TIME_MS);
  expect(await page.evaluate(() => 'sameDocument' in window)).toBe(true);
};

const readyToShip = async (page: Page) => {
  await inventory(page);
  await openTab(page, '출고 관리');
  await page.getByRole('button', { name: /^출고 준비 완료/ }).click();
  await expect(firstRow(page)).toBeVisible();
};
const receivingPending = async (page: Page) => {
  await inventory(page);
  await openTab(page, '입고 관리');
  await expect(page.getByRole('button', { name: /^입고 대기 \(\d+\)/ })).toBeVisible();
  await expect(firstRow(page)).toBeVisible();
};

/** 재고 화면의 "전체 보기" 링크로 안전재고에 가 첫 부족 품목의 구매 요청을 만든다 */
const requestLowStockPurchase = async (page: Page) => {
  await inventory(page);
  await page.getByRole('link', { name: '전체 보기 →' }).click();
  await page.waitForURL((url) => url.pathname === '/low-stock');
  await page
    .getByRole('checkbox', { name: / 선택$/ })
    .nth(1)
    .check();
  await page.getByRole('button', { name: '선택 품목 발주' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '발주 요청' }).click();
  await expect(page.getByText('발주 요청이 생성되었습니다.')).toBeVisible();
};

test.describe('다녀온 화면으로 30초 안에 돌아와도 다른 화면에서 바꾼 것이 보인다', () => {
  // 배송 시작 버튼은 공급사에게만 보이고 공급사는 재고 화면에 못 들어간다(목 상태도 로그인별).
  // 그래서 같은 로그인의 쓰기를 화면 밖에서 보낸다. 무효화가 아예 안 도는 경우라 버튼보다 엄한 검사다
  test('발주 배송 시작 → 재고 입고 대기', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    const list = await page.request.get(
      '/api/proxy/scm-pp/mm/purchase-orders?statusCode=APPROVAL&page=0&size=1',
    );
    const body: { data: { content: { purchaseOrderId: string; purchaseOrderNumber: string }[] } } =
      await list.json();
    const [order] = body.data.content;

    await withinStaleTime(page, async () => {
      await receivingPending(page);
      await expect(page.getByRole('row', { name: order.purchaseOrderNumber })).toHaveCount(0);
      await purchase(page);
      await openTab(page, '발주서');
      await expect(page.getByRole('row', { name: order.purchaseOrderNumber })).toBeVisible();
      const started = await page.evaluate(
        async (id) =>
          (await fetch(`/api/proxy/scm-pp/mm/${id}/start-delivery`, { method: 'POST' })).status,
        order.purchaseOrderId,
      );
      expect(started).toBe(200);
      await receivingPending(page);
      await expect(page.getByRole('row', { name: order.purchaseOrderNumber })).toBeVisible();
    });
  });

  test('즉시 납품 → 재고 출고 준비', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    // qt-016: 재고 안이라 바로 납품할 수 있는 대기 견적(e2e/demo-seed.spec.ts)
    const detail = await page.request.get('/api/proxy/business/sd/quotations/qt-016');
    const body: { data: { quotationNumber: string } } = await detail.json();
    const quote = body.data.quotationNumber;

    await withinStaleTime(page, async () => {
      await readyToShip(page);
      await expect(page.getByRole('row', { name: `SO-${quote}` })).toHaveCount(0);
      await sales(page);
      await page.getByRole('checkbox', { name: `${quote} 선택` }).check();
      await page.getByRole('button', { name: '견적 검토 요청' }).click();
      const dialog = page.getByRole('dialog', { name: '견적 검토 요청' });
      await dialog.getByRole('button', { name: '재고 확인' }).click();
      await dialog.getByRole('button', { name: '즉시 납품 처리' }).click();
      await expect(page.getByText(/즉시 납품 처리가 완료되었습니다/)).toBeVisible();
      await page.keyboard.press('Escape');
      await readyToShip(page);
      await expect(page.getByRole('row', { name: `SO-${quote}` })).toBeVisible();
    });
  });

  test('안전재고 구매 요청 → 구매 요청 목록 맨 위', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await withinStaleTime(page, async () => {
      await purchase(page);
      await expect(firstRow(page)).toContainText('PR-2026-015');
      await requestLowStockPurchase(page);
      await purchase(page);
      await expect(firstRow(page)).toContainText('PR-2026-016');
    });
  });

  test('전표 처리 → 대시보드 작업 현황', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await withinStaleTime(page, async () => {
      const item = page.getByText(/^AR-\d/).first();
      await expect(item).toBeVisible();
      const number = (await item.textContent())?.match(/AR-[\w-]+/)?.[0] ?? '';
      expect(number).not.toBe('');
      await finance(page);
      await page.getByRole('checkbox', { name: `${number} 선택` }).check();
      await page.getByRole('button', { name: '미수 처리 신청' }).click();
      await expect(
        page.getByRole('row', { name: new RegExp(number) }).getByText('완납', { exact: true }),
      ).toBeVisible();
      await dashboard(page);
      // 다음 전표가 보인 뒤에 본다. 받기 전에는 무엇이든 없다
      await expect(page.getByText(/^AR-\d/).first()).toBeVisible();
      await expect(page.getByText(number)).toHaveCount(0);
    });
  });
});

test('로그아웃한 사람이 만든 구매 요청이 같은 탭에서 들어온 다음 사람에게 안 보인다', async ({
  page,
}) => {
  await loginAs(page, 'ADMIN');
  const requests = listRequests(page, 'scm-pp/mm/purchase-requisitions');
  await requestLowStockPurchase(page);
  await withinStaleTime(page, async () => {
    await purchase(page);
    await expect(firstRow(page)).toContainText('PR-2026-016');
    await page.getByRole('button', { name: /전사 관리자/ }).click();
    await page.getByRole('button', { name: '로그아웃' }).click();
    await page.waitForURL(/\/login/);
    requests.length = 0;
    await signIn(page, 'MM_ADMIN');
    await purchase(page);
    await expect(firstRow(page)).toContainText('PR-2026-015');
    await expect(page.getByText('PR-2026-016')).toHaveCount(0);
    expect(requests.length).toBeGreaterThanOrEqual(1);
  });
});

/** 한 번 들어갈 때 같은 목록의 요청은 1번. 처음 값이 화면이 고르는 첫 항목과 다르면 2번 나간다 */
const LISTS: { name: string; path: string; open: (page: Page) => Promise<void> }[] = [
  { name: '재고 목록', path: 'scm-pp/iv/inventory-items', open: inventory },
  { name: '구매 요청', path: 'scm-pp/mm/purchase-requisitions', open: purchase },
  {
    name: '발주서',
    path: 'scm-pp/mm/purchase-orders',
    open: async (page) => {
      await purchase(page);
      await openTab(page, '발주서');
    },
  },
  {
    name: '생산 MES',
    path: 'scm-pp/pp/mes',
    open: async (page) => {
      await production(page);
      await openTab(page, 'MES');
    },
  },
  {
    name: '생산 MRP 순소요',
    path: 'scm-pp/pp/quotations/mrp',
    open: async (page) => {
      await production(page);
      await openTab(page, 'MRP');
    },
  },
  { name: '영업 견적', path: 'business/sd/quotations', open: sales },
  {
    name: '영업 주문',
    path: 'business/sd/orders',
    open: async (page) => {
      await sales(page);
      await openTab(page, '주문 관리');
    },
  },
  {
    name: '영업 고객',
    path: 'business/sd/customers',
    open: async (page) => {
      await sales(page);
      await openTab(page, '고객 관리');
    },
  },
  {
    name: '안전재고',
    path: 'scm-pp/iv/shortage',
    open: async (page) => {
      await inventory(page);
      await page.getByRole('link', { name: '전체 보기 →' }).click();
      await page.waitForURL((url) => url.pathname === '/low-stock');
    },
  },
  { name: '매출 전표', path: 'business/fcm/invoice/ar', open: finance },
];

for (const { name, path, open } of LISTS) {
  test(`목록 요청은 한 번 들어갈 때 1번: ${name}`, async ({ page }) => {
    await loginAs(page, 'ADMIN');
    const requests = listRequests(page, path);
    await open(page);
    await expect(firstRow(page)).toBeVisible();
    await settled(page);
    expect(requests).toHaveLength(1);
  });
}
