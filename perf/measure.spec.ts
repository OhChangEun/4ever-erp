import { test, type Page } from '@playwright/test';

/**
 * 목록 화면 3개의 첫 진입과 탭 전환을 잰다. 각 3번 재고 중앙값. CPU 4배 느리게(CDP).
 * - LCP: PerformanceObserver(largest-contentful-paint)
 * - 긴 작업 합(TBT 근사): longtask 중 50ms 넘는 부분의 합
 * - 스크립트 전송량: resource timing 의 script transferSize 합
 * - API 요청 수: 첫 진입, 다른 탭으로, 다시 첫 탭으로(30초 staleTime 안이면 0 이어야 한다)
 */
const SCREENS = [
  { url: '/purchase', first: '구매 요청', second: '발주서' },
  { url: '/sales', first: '견적 관리', second: '주문 관리' },
  { url: '/inventory', first: '재고 목록', second: '출고 관리' },
];
const RUNS = 3;

/** 화면 없이 로그인한다. 측정할 화면이 그 컨텍스트의 첫 페이지가 되게(스크립트 캐시 없음) */
const login = async (page: Page) => {
  const res = await page.request.post('/api/auth/login', {
    data: { loginId: 'ADMIN' },
    headers: {
      origin: new URL(page.url() === 'about:blank' ? 'http://localhost:3200' : page.url()).origin,
    },
  });
  if (!res.ok()) throw new Error(`login ${res.status()}`);
};

/** API 요청이 0.8초 동안 새로 없을 때까지 기다린다(클라이언트 탭 전환은 load 이벤트가 없다) */
const settle = async (page: Page, count: () => number) => {
  let last = -1;
  let stableSince = Date.now();
  for (;;) {
    const now = count();
    if (now !== last) {
      last = now;
      stableSince = Date.now();
    } else if (Date.now() - stableSince > 800) return;
    await page.waitForTimeout(100);
  }
};

const observe = async (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __perf: { lcp: number; tbt: number } };
    w.__perf = { lcp: 0, tbt: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.__perf.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.__perf.tbt += Math.max(0, entry.duration - 50);
    }).observe({ type: 'longtask', buffered: true });
  });

const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test('목록 화면 3개 기준선', async ({ browser }) => {
  const rows: string[] = [];
  for (const screen of SCREENS) {
    const samples = {
      lcp: [] as number[],
      tbt: [] as number[],
      js: [] as number[],
      load: [] as number[],
      toSecond: [] as number[],
      back: [] as number[],
    };
    for (let run = 0; run < RUNS; run += 1) {
      const context = await browser.newContext();
      const page = await context.newPage();
      // Lighthouse 모바일처럼 CPU 를 4배 느리게. 빠른 맥에선 긴 작업이 0 으로만 나온다
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await login(page);
      await observe(page);
      let apiCalls = 0;
      page.on('request', (req) => {
        if (req.url().includes('/api/proxy/')) apiCalls += 1;
      });

      await page.goto(screen.url, { waitUntil: 'load' });
      await settle(page, () => apiCalls);
      samples.load.push(apiCalls);
      const metrics = await page.evaluate(() => {
        const w = window as unknown as { __perf: { lcp: number; tbt: number } };
        const js = performance
          .getEntriesByType('resource')
          .filter((e) => e.name.endsWith('.js'))
          .reduce((sum, e) => sum + (e as PerformanceResourceTiming).transferSize, 0);
        return { ...w.__perf, js };
      });
      samples.lcp.push(metrics.lcp);
      samples.tbt.push(metrics.tbt);
      samples.js.push(metrics.js);

      apiCalls = 0;
      await page.getByText(screen.second, { exact: true }).first().click();
      await settle(page, () => apiCalls);
      samples.toSecond.push(apiCalls);
      apiCalls = 0;
      await page.getByText(screen.first, { exact: true }).first().click();
      await settle(page, () => apiCalls);
      samples.back.push(apiCalls);
      await context.close();
    }
    rows.push(
      `| ${screen.url} | ${median(samples.lcp).toFixed(0)} | ${median(samples.tbt).toFixed(0)} | ${(median(samples.js) / 1024).toFixed(0)} | ${median(samples.load)} | ${median(samples.toSecond)} | ${median(samples.back)} |`,
    );
  }
  console.log(
    [
      '| 화면 | LCP(ms) | 긴 작업 합(ms) | 스크립트 전송(KB) | 첫 진입 API | 다른 탭으로 API | 첫 탭으로 돌아올 때 API |',
      '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
      ...rows,
    ].join('\n'),
  );
});
