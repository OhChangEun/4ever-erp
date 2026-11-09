// 라우트별 첫 로드 JS(gzip)를 기준선과 비교한다(CI 번들 크기 비교 카드).
//   node scripts/bundle-diff.mjs <기준선.json> <지금.json> [예산KB=5]
// 두 파일은 `node scripts/measure-bundle.mjs --json` 의 출력이다. 마크다운 표를 찍고,
// 한 라우트라도 예산보다 많이 늘면 종료 코드 1. 의도한 증가면 같은 PR 에서 `pnpm bundle:baseline`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const KB = 1024;
const kb = (bytes) => (bytes / KB).toFixed(1);
const signed = (bytes) => `${bytes >= 0 ? '+' : ''}${kb(bytes)}`;

/** @param {{route:string,gzip:number}[]} baseline @param {{route:string,gzip:number}[]} current */
export const diffBundles = (baseline, current, budgetKb = 5) => {
  const before = new Map(baseline.map((r) => [r.route, r.gzip]));
  const after = new Map(current.map((r) => [r.route, r.gzip]));
  const rows = [];
  const over = [];

  for (const { route, gzip } of current) {
    const base = before.get(route);
    if (base === undefined) {
      rows.push(`| ${route} | - | ${kb(gzip)} | 새 라우트 |`);
      continue;
    }
    const delta = gzip - base;
    const mark = delta > budgetKb * KB ? ' 예산 초과' : '';
    if (mark) over.push({ route, delta });
    rows.push(`| ${route} | ${kb(base)} | ${kb(gzip)} | ${signed(delta)}${mark} |`);
  }
  for (const { route, gzip } of baseline) {
    if (!after.has(route)) rows.push(`| ${route} | ${kb(gzip)} | - | 없어짐 |`);
  }

  const markdown = [
    `### 첫 로드 JS(gzip, KB). 라우트당 예산 +${budgetKb}KB`,
    '',
    '| 라우트 | 기준 | 지금 | 차이 |',
    '| --- | ---: | ---: | ---: |',
    ...rows,
    '',
    over.length
      ? `예산을 넘은 라우트 ${over.length}개. 의도한 증가면 \`pnpm bundle:baseline\` 으로 기준선을 갱신한다.`
      : '예산 안.',
  ].join('\n');

  return { ok: over.length === 0, over, markdown };
};

// CLI 로 불렸을 때만 실행
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [baselinePath, currentPath, budget] = process.argv.slice(2);
  if (!baselinePath || !currentPath) {
    console.error('사용: node scripts/bundle-diff.mjs <기준선.json> <지금.json> [예산KB]');
    process.exit(2);
  }
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
  const result = diffBundles(read(baselinePath), read(currentPath), Number(budget ?? 5));
  console.log(result.markdown);
  process.exit(result.ok ? 0 : 1);
}
