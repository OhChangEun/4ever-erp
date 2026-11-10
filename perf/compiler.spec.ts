import { test, type Page } from '@playwright/test';

/**
 * React Compiler 전후 비교(React Compiler 카드). 운영 빌드에서 같은 조작을 하고
 * 그동안 쓴 JS 실행 시간(CDP ScriptDuration)과 React 커밋 수를 잰다. CPU 4배 감속, 3번 중앙값.
 * 커밋 수는 DevTools 훅(__REACT_DEVTOOLS_GLOBAL_HOOK__)의 onCommitFiberRoot 호출 수다.
 * 실행: pnpm build && pnpm exec playwright test -c playwright.perf.config.ts compiler
 */
const RUNS = 3;

const installCommitCounter = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __commits: number; __REACT_DEVTOOLS_GLOBAL_HOOK__: unknown };
    w.__commits = 0;
    w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      isDisabled: false,
      supportsFiber: true,
      renderers: new Map(),
      inject: () => 1,
      checkDCE: () => {},
      onScheduleFiberRoot: () => {},
      onCommitFiberRoot: () => {
        w.__commits += 1;
      },
      onCommitFiberUnmount: () => {},
      onPostCommitFiberRoot: () => {},
    };
  });

const login = async (page: Page) => {
  const res = await page.request.post('/api/auth/login', {
    data: { loginId: 'ADMIN' },
    headers: { origin: 'http://localhost:3200' },
  });
  if (!res.ok()) throw new Error(`login ${res.status()}`);
};

/** 화면에서 사람이 하는 조작. 매번 같은 순서 */
const interact = async (page: Page) => {
  for (const period of ['이번 달', '이번 분기', '연도별', '이번 주']) {
    await page.getByRole('button', { name: period }).first().click();
    await page.waitForTimeout(150);
  }
  const combobox = page.getByRole('combobox').first();
  for (let i = 0; i < 3; i += 1) {
    await combobox.click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Escape');
  }
  const search = page.getByPlaceholder(/검색어/).first();
  await search.click();
  await search.pressSequentially('PR-2026', { delay: 60 });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '발주서' }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: '구매 요청' }).first().click();
  await page.waitForTimeout(800);
};

const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test('React Compiler 전후: 구매 화면 조작의 JS 시간과 커밋 수', async ({ browser }) => {
  const script: number[] = [];
  const commits: number[] = [];
  for (let run = 0; run < RUNS; run += 1) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await installCommitCounter(page);
    await login(page);
    await page.goto('/purchase');
    await page.waitForLoadState('networkidle');
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Performance.enable');
    const metric = async () => {
      const { metrics } = await cdp.send('Performance.getMetrics');
      return metrics.find((m) => m.name === 'ScriptDuration')?.value ?? 0;
    };
    const commitCount = () =>
      page.evaluate(() => (window as unknown as { __commits: number }).__commits);
    const [s0, c0] = [await metric(), await commitCount()];
    await interact(page);
    const [s1, c1] = [await metric(), await commitCount()];
    script.push((s1 - s0) * 1000);
    commits.push(c1 - c0);
    await context.close();
  }
  console.log(
    `RESULT script_ms=${median(script).toFixed(0)} commits=${median(commits)} samples=${script
      .map((s) => s.toFixed(0))
      .join('/')} commits=${commits.join('/')}`,
  );
});
