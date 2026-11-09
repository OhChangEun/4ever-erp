// 라우트별 첫 로드 JS 크기(gzip)를 잰다. 성능 블록 기준선 카드(계획 9절 1번).
// next build 뒤에 돌린다: node scripts/measure-bundle.mjs [--json]
// 정적 렌더된 HTML(.next/server/app/*.html)이 처음 받는 <script src> 청크를 모아 크기를 더한다.
// 큰 청크는 안에 든 패키지 이름(turbopack 모듈 경로)으로 무엇인지 적는다.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const APP = '.next/server/app';
const STATIC = '.next';
// production 청크에는 node_modules 경로가 남지 않는다. 패키지마다 고유한 문자열로 알아본다
const SIGNATURES = {
  'MUI 날짜 선택기': 'MuiDateCalendar',
  'MUI 기본': 'MuiButtonBase',
  'date-fns': 'formatDistance',
  three: 'WebGLRenderer',
  recharts: 'recharts-wrapper',
  d3: 'd3-hierarchy',
  'framer-motion': 'framer',
  'dnd-kit': 'DndContext',
  zod: 'ZodError',
  'react-query-devtools': 'ReactQueryDevtools',
  msw: 'mockServiceWorker',
};

const sizeCache = new Map();
const chunkInfo = (src) => {
  if (sizeCache.has(src)) return sizeCache.get(src);
  const file = join(STATIC, src.replace(/^\/_next/, ''));
  const buf = existsSync(file) ? readFileSync(file) : Buffer.alloc(0);
  const text = buf.toString('utf8');
  const info = {
    raw: buf.length,
    gzip: gzipSync(buf).length,
    packages: Object.entries(SIGNATURES)
      .filter(([, signature]) => text.includes(signature))
      .map(([name]) => name),
  };
  sizeCache.set(src, info);
  return info;
};

const routes = readdirSync(APP)
  .filter((name) => name.endsWith('.html') && !name.startsWith('_'))
  .map((name) => {
    const html = readFileSync(join(APP, name), 'utf8');
    const srcs = [
      ...new Set(
        [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]),
      ),
    ];
    const chunks = srcs.map((src) => ({ src, ...chunkInfo(src) }));
    return {
      route: `/${name.replace(/\.html$/, '').replace(/^index$/, '')}`,
      chunks: chunks.length,
      raw: chunks.reduce((s, c) => s + c.raw, 0),
      gzip: chunks.reduce((s, c) => s + c.gzip, 0),
      packages: [...new Set(chunks.flatMap((c) => c.packages))],
    };
  })
  .sort((a, b) => b.gzip - a.gzip);

const kb = (n) => (n / 1024).toFixed(1);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(routes, null, 2));
} else {
  console.log('| 라우트 | 청크 수 | 첫 로드 JS(gzip, KB) | 원본(KB) | 들어 있는 큰 패키지 |');
  console.log('| --- | ---: | ---: | ---: | --- |');
  for (const r of routes) {
    console.log(
      `| ${r.route} | ${r.chunks} | ${kb(r.gzip)} | ${kb(r.raw)} | ${r.packages.join(', ')} |`,
    );
  }
  const shared = [...sizeCache.entries()].sort((a, b) => b[1].gzip - a[1].gzip).slice(0, 8);
  console.log(
    '\n큰 청크 8개(gzip KB): ' +
      shared
        .map(([src, i]) => `${src.split('/').pop()} ${kb(i.gzip)} [${i.packages.join(' ')}]`)
        .join(' / '),
  );
}
