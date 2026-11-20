// 실행 예시: pnpm build && pnpm start --port 3200
// 별도 터미널: node perf/bom-tree.mjs 'http://localhost:3200/production?tab=bom' /tmp/bom/result progressive
// 모든 노드가 처음부터 펼쳐지는 비교 버전에서는 마지막 인수를 full로 지정한다.
// 각 버전의 서버는 준비한 뒤 하나씩 측정한다. 출력은 로컬 비교 자료다.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [address, evidenceDir, mode = 'full'] = process.argv.slice(2);
if (!['full', 'progressive'].includes(mode)) throw new Error('mode는 full 또는 progressive입니다.');
if (!address || !evidenceDir) throw new Error('생산 BOM 페이지 URL과 결과 디렉터리가 필요합니다.');
const url = new URL(address);
const out = resolve(evidenceDir);
const viewport = { width: 1440, height: 1000 };
const runs = 3;

// 완전 이진 트리. 루트의 왼쪽 조립품에 테스트용 이름을 붙이고, 마지막 자재의 단가는 비운다.
const synthetic = Array.from({ length: 1023 }, (_, index) => ({
  id: 'n-' + index,
  code: 'B-' + String(index).padStart(4, '0'),
  name: index === 0 ? '모터 A' : index === 1 ? '로터 조립' : '품목 ' + index,
  level: Math.floor(Math.log2(index + 1)),
  parentId: index === 0 ? null : 'n-' + Math.floor((index - 1) / 2),
  quantity: index === 0 ? null : 1,
  unit: index === 0 ? null : 'EA',
  unitCost: index >= 511 && index !== 1022 ? 100 : null,
}));

// 시작은 페이지가 받은 실제 입력 이벤트다. 끝은 대상 DOM 상태를 감지한 뒤
// 다음 두 번의 animation frame 중 두 번째다. 물리 화면의 픽셀 표시 시각은 알 수 없다.
async function armTiming(page, action) {
  await page.evaluate((action) => {
    const type = action === 'open' ? 'click' : 'keydown';
    document.addEventListener(
      type,
      function handle(event) {
        const match =
          action === 'open' ? Boolean(event.target.closest('button')) : event.key === 'Enter';
        if (!match) return;
        document.removeEventListener(type, handle, true);
        performance.mark('bom-input');
        const expected = action === 'open' ? null : 'false';
        const selector =
          '[role="group"][aria-label="BOM 원가 트리"] :is(button, [role="button"])[aria-label^="로터 조립"]';
        const check = () => {
          const state = document.querySelector(selector)?.getAttribute('aria-expanded');
          if (state == null || (expected !== null && state !== expected)) {
            requestAnimationFrame(check);
            return;
          }
          requestAnimationFrame(() => performance.mark('bom-next-frame'));
        };
        requestAnimationFrame(check);
      },
      true,
    );
  }, action);
}

const frame = (page) =>
  page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
async function timedAction(page, cdp, type, act) {
  await page.evaluate(() => {
    performance.clearMarks('bom-input');
    performance.clearMarks('bom-next-frame');
  });
  await armTiming(page, type);
  const before = await cdp.send('Performance.getMetrics');
  await act();
  await page.waitForFunction(
    () => performance.getEntriesByName('bom-next-frame').length > 0,
    null,
    { timeout: 25000 },
  );
  const after = await cdp.send('Performance.getMetrics');
  const metrics = await page.evaluate(() => {
    const input = performance.getEntriesByName('bom-input').at(-1).startTime;
    const end = performance.getEntriesByName('bom-next-frame').at(-1).startTime;
    const resources = performance
      .getEntriesByType('resource')
      .filter((r) => r.startTime >= input && r.responseEnd <= end);
    const detail = resources.find((r) => new URL(r.name).pathname.endsWith('/boms/bom-001'));
    const scripts = resources.filter((r) => new URL(r.name).pathname.endsWith('.js'));
    return {
      inputToFrameMs: end - input,
      inputToResponseEndMs: detail ? detail.responseEnd - input : null,
      detailRequestMs: detail?.duration ?? null,
      scriptsTransferredBytes: scripts.reduce((sum, r) => sum + r.transferSize, 0),
      scriptRequests: scripts.length,
    };
  });
  const start = Object.fromEntries(before.metrics.map((m) => [m.name, m.value]));
  const end = Object.fromEntries(after.metrics.map((m) => [m.name, m.value]));
  for (const metric of ['ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration']) {
    metrics[metric + 'Ms'] = 1000 * (end[metric] - start[metric]);
  }
  return metrics;
}

async function runSession(browser, size, run) {
  const context = await browser.newContext({ viewport, locale: 'ko-KR', deviceScaleFactor: 1 });
  try {
    const login = await context.request.post(url.origin + '/api/auth/login', {
      data: { loginId: 'ADMIN' },
      headers: { origin: url.origin },
    });
    if (!login.ok()) throw new Error('데모 로그인 실패 ' + login.status());
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Performance.enable');
    // 두 크기 모두 상세 요청을 같은 방식으로 처리한다. 라우팅은 HTTP 캐시를 끄므로
    // 재열기는 같은 탭의 React Query/모듈 캐시를 쓰는 조건이다.
    let inputFixture;
    await page.route('**/boms/bom-001', async (route) => {
      const response = await route.fetch();
      if (!response.ok()) throw new Error('상세 조회 실패 ' + response.status());
      const payload = await response.json();
      if (payload.data.levelStructure.length !== 9)
        throw new Error('데모 BOM 노드 수가 바뀌었습니다.');
      if (size === 1023) payload.data.levelStructure = synthetic;
      inputFixture = payload.data.levelStructure;
      await route.fulfill({ response, json: payload });
    });
    await page.goto(address);
    const detail = page.getByRole('button', { name: '상세보기', exact: true }).first();
    const tree = page.getByRole('group', { name: 'BOM 원가 트리', exact: true });
    const rotor = tree.getByRole('button', { name: /^로터 조립/ });
    await expect(detail).toBeVisible();
    await page.waitForLoadState('networkidle');
    const cold = await timedAction(page, cdp, 'open', () => detail.click());
    const progressive = mode === 'progressive' && size === 1023;
    const initialState = progressive ? 'false' : 'true';
    await expect(rotor).toHaveAttribute('aria-expanded', initialState);
    const buttons = await tree.getByRole('button').count();
    if (buttons !== (size === 9 || progressive ? 3 : 511))
      throw new Error('초기 조립품 수 불일치 ' + buttons);

    // 스크롤/포커스를 강제로 옮기기 전에, 노드가 자기 스크롤 영역 안에 들어오는지 본다.
    const initialVisibility = await tree.evaluate((el) => {
      const box = el.closest('.overflow-auto') ?? el.parentElement;
      const clip = box.getBoundingClientRect();
      const visible = (prefix) => {
        const rect = el
          .querySelector(':is(button, [role="button"])[aria-label^="' + prefix + '"]')
          .getBoundingClientRect();
        return {
          inChartArea:
            rect.bottom > clip.top &&
            rect.top < clip.bottom &&
            rect.right > clip.left &&
            rect.left < clip.right,
          inBrowserViewport:
            rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth,
          yFromScrollArea: Math.round(rect.top - clip.top),
        };
      };
      return {
        root: visible('모터 A'),
        rotor: visible('로터 조립'),
        chartHeight: Math.round(clip.height),
        scrollTop: box.scrollTop,
      };
    });
    const chartBox = tree.locator(
      'xpath=ancestor-or-self::*[contains(concat(" ", normalize-space(@class), " "), " overflow-auto ")][1]',
    );
    if (run === 1) {
      const name = size === 9 ? 'fixture-demo.json' : 'fixture-1023.json';
      await writeFile(resolve(out, name), JSON.stringify(inputFixture));
      // 요소 전체(SVG 높이 수만 px) 대신 사용자가 보는 스크롤 영역만 캡처한다.
      await chartBox.screenshot({
        path: resolve(out, size === 9 ? 'expanded.png' : 'large-initial.png'),
      });
    }
    // 큰 트리를 단계별로 펼치는 모드에서는 같은 자재에 도달하는 데 든 조작을 따로 기록한다.
    let expansionsToLeaf = null;
    if (progressive) {
      expansionsToLeaf = 0;
      const leaf = tree.getByText('품목 511', { exact: true });
      await expect(leaf).toHaveCount(0);
      for (let id = 1; id < 511; id = id * 2 + 1) {
        const assembly =
          id === 1
            ? rotor
            : tree.getByRole('button', { name: new RegExp('^품목 ' + id + '(?=\\D|$)') });
        await expect(assembly).toHaveAttribute('aria-expanded', 'false');
        await assembly.focus();
        await page.keyboard.press('Enter');
        await expect(assembly).toHaveAttribute('aria-expanded', 'true');
        await expect(assembly).toBeFocused();
        expansionsToLeaf++;
      }
      await expect(leaf).toHaveCount(1);
      if (run === 1) {
        await leaf.scrollIntoViewIfNeeded();
        await chartBox.screenshot({ path: resolve(out, 'large-leaf.png') });
      }
    }
    const beforeCollapseButtons = await tree.getByRole('button').count();
    await rotor.focus();
    await frame(page);
    const collapse = await timedAction(page, cdp, 'collapse', () => page.keyboard.press('Enter'));
    await expect(rotor).toBeFocused();
    await expect(rotor).toHaveAttribute('aria-expanded', 'false');
    const foldedButtons = await tree.getByRole('button').count();
    if (foldedButtons !== (size === 9 || progressive ? 3 : 257))
      throw new Error('접힌 후 조립품 수 불일치 ' + foldedButtons);
    if (size === 9 && run === 1) {
      await chartBox.screenshot({ path: resolve(out, 'collapsed.png') });
    }
    await page.keyboard.press('Space');
    await expect(rotor).toHaveAttribute('aria-expanded', 'true');
    await expect(rotor).toBeFocused();

    const reexpandedButtons = await tree.getByRole('button').count();
    if (progressive) await expect(tree.getByText('품목 511', { exact: true })).toHaveCount(1);

    // 노드가 많은 상황에서 차트가 휠 입력을 가로채는지 실제 휠 이벤트로 확인한다.
    let scrollDelta = null;
    if (size === 1023) {
      const isScrollable = (el) => {
        while (
          el &&
          !(el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))
        )
          el = el.parentElement;
        return el;
      };
      const scrollBox = await tree.evaluateHandle(isScrollable);
      const el = scrollBox.asElement();
      if (!el) throw new Error('차트를 스크롤할 영역이 없습니다.');
      await el.scrollIntoViewIfNeeded();
      await el.evaluate((e) => {
        e.scrollTop = 0;
      });
      await el.hover({ position: { x: 30, y: 30 } });
      const prev = await el.evaluate((e) => e.scrollTop);
      await page.mouse.wheel(0, 360);
      await expect.poll(() => el.evaluate((e) => e.scrollTop)).toBeGreaterThan(prev);
      scrollDelta = (await el.evaluate((e) => e.scrollTop)) - prev;
    }
    await page.getByRole('button', { name: '표로 보기' }).click();
    const table = page.getByRole('table', { name: 'BOM 원가 표' });
    await expect(table.locator('tbody tr')).toHaveCount(size);
    await expect(table.locator('tbody tr').first()).toContainText(
      size === 9 ? '₩54,960 이상' : '₩51,100 이상',
    );
    await expect(table.getByText('단가 없음', { exact: true }).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(table).toBeHidden();
    const reopen = await timedAction(page, cdp, 'open', () => detail.click());
    await expect(rotor).toHaveAttribute('aria-expanded', initialState);
    return {
      size,
      run,
      cold,
      collapse,
      reopen,
      initialVisibility,
      buttons,
      foldedButtons,
      reexpandedButtons,
      beforeCollapseButtons,
      restoredAllAssemblies: reexpandedButtons === beforeCollapseButtons,
      expansionsToLeaf,
      scrollDelta,
      tableRows: size,
    };
  } finally {
    await context.close();
  }
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const samples = [];
  for (const size of [9, 1023]) {
    for (let run = 1; run <= runs; run++) {
      const sample = await runSession(browser, size, run);
      samples.push(sample);
      await writeFile(
        resolve(out, 'samples.json'),
        JSON.stringify(
          {
            address,
            mode,
            chrome: browser.version(),
            viewport,
            cpuSlowdown: 4,
            runs,
            samples,
          },
          null,
          2,
        ) + '\n',
      );
      console.log(
        size,
        run,
        [sample.cold, sample.collapse, sample.reopen]
          .map((s) => Math.round(s.inputToFrameMs))
          .join(' / '),
      );
    }
  }
} finally {
  await browser.close();
}
