/**
 * BOM 상세의 순수 계산만 비교한다. 두 입력은 화면 측정 때 저장한 levelStructure JSON 배열이다.
 * node perf/bom-phases.mjs <기준 커밋> <데모 입력.json> <합성 입력.json> > phases.json
 * 다운로드, React, SVG DOM, 페인트는 포함하지 않는다.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const [base, ...fixtures] = process.argv.slice(2);
if (!base || fixtures.length !== 2) {
  throw new Error('기준 커밋과 levelStructure JSON 파일 두 개를 지정하세요.');
}
const repo = fileURLToPath(new URL('../', import.meta.url));
const dir = 'src/app/(private)/production/utils';
const digest = (source) => createHash('sha256').update(source).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
const revision = git('rev-parse', '--verify', base + '^{commit}').trim();
const scratch = await mkdtemp(join(tmpdir(), 'everp-bom-phase-'));
const current = resolve(repo, dir);
const cpuRate = 4;
const warmups = 5;
const samples = 21;
let browser;

try {
  // 예전 buildBomTree의 상대 import가 예전 변환 함수를 그대로 가리키게 두 파일을 함께 꺼낸다.
  for (const name of ['buildBomTree.ts', 'bomTreeUtils.ts']) {
    await writeFile(join(scratch, name), git('show', revision + ':' + dir + '/' + name));
  }
  const exports = [
    [join(scratch, 'buildBomTree.ts'), 'buildBomTree as before'],
    [join(current, 'buildBomTree.ts'), 'buildBomTree as after'],
    [join(current, 'bomCost.ts'), 'rollupBomCost'],
    [join(current, 'bomLayout.ts'), 'bomLayout'],
  ].map(([path, names]) => `export { ${names} } from ${JSON.stringify(path)};`);
  // 새 pnpm 설치는 전이 의존성 esbuild CLI를 루트 .bin에 노출하지 않는다.
  // 실제 설치된 Vitest → Vite → esbuild를 pnpm의 모듈 경로로 찾는다.
  const require = createRequire(import.meta.url);
  const vitestRequire = createRequire(require.resolve('vitest'));
  const viteRequire = createRequire(vitestRequire.resolve('vite'));
  const esbuild = viteRequire('esbuild');
  const { outputFiles } = await esbuild.build({
    stdin: { contents: exports.join('\n'), resolveDir: repo, loader: 'ts' },
    bundle: true,
    format: 'iife',
    globalName: 'bomFunctions',
    write: false,
  });

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ locale: 'ko-KR' });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  await page.addScriptTag({ content: outputFiles[0].text });
  const results = [];
  for (const fixture of fixtures) {
    const raw = await readFile(fixture, 'utf8');
    const rows = JSON.parse(raw);
    assert(Array.isArray(rows) && rows.length > 0, 'levelStructure는 비지 않은 배열이어야 합니다.');
    // 작은 입력은 연속 호출 평균을 써서 Chrome 타이머의 해상도보다 긴 구간을 잰다.
    const batch = rows.length < 100 ? 100 : 1;
    const result = await page.evaluate(
      ({ rows, batch, warmups, samples }) => {
        const { before, after, rollupBomCost, bomLayout } = window.bomFunctions;
        const previous = before(rows);
        const updated = after(rows);
        if (previous.error || updated.error || !previous.treeData || !updated.treeData)
          throw new Error('트리 변환 실패');
        if (JSON.stringify(previous) !== JSON.stringify(updated))
          throw new Error('트리 구조 또는 처리 결과 불일치');
        const root = updated.treeData;
        const expanded = new Set();
        const layout = bomLayout(root, expanded);
        if (layout.nodes.length !== rows.length) throw new Error('입력 수와 펼친 노드 수 불일치');
        const cost = rollupBomCost(root);
        const tasks = [
          ['buildBefore', () => before(rows)],
          ['buildAfter', () => after(rows)],
          ['cost', () => rollupBomCost(root)],
          ['layout', () => bomLayout(root, expanded)],
        ];
        const times = Object.fromEntries(tasks.map(([name]) => [name, []]));
        for (let round = 0; round < warmups + samples; round += 1) {
          // 같은 함수가 매번 첫 번째나 마지막에 실행되지 않게 순서를 돌린다.
          for (let offset = 0; offset < tasks.length; offset += 1) {
            const [name, run] = tasks[(round + offset) % tasks.length];
            const start = performance.now();
            for (let n = 0; n < batch; n += 1) run();
            const time = (performance.now() - start) / batch;
            if (round >= warmups) times[name].push(time);
          }
        }
        return {
          identicalTrees: true,
          nodeCount: layout.nodes.length,
          linkCount: layout.links.length,
          totalCost: cost.total,
          partialCost: cost.partial,
          missingCostLeaves: cost.missingCount,
          batch,
          durationsMs: times,
        };
      },
      { rows, batch, warmups, samples },
    );
    const medianMs = Object.fromEntries(
      Object.entries(result.durationsMs).map(([key, values]) => [
        key,
        values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)],
      ]),
    );
    results.push({ fixture: basename(fixture), fixtureSha256: digest(raw), ...result, medianMs });
  }
  const files = {};
  for (const name of ['buildBomTree.ts', 'bomTreeUtils.ts', 'bomCost.ts', 'bomLayout.ts']) {
    files[name] = digest(await readFile(join(current, name)));
  }
  console.log(
    JSON.stringify(
      {
        baseline: revision,
        currentSourceSha256: files,
        chrome: browser.version(),
        platform: process.platform,
        arch: process.arch,
        cpuRate,
        warmups,
        samples,
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  await rm(scratch, { recursive: true, force: true });
}
