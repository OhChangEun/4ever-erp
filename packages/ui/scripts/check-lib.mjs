// @everp/ui 빌드 결과 확인(라이브러리 빌드 카드). pnpm --filter @everp/ui check:lib
// 1. dist 에 ESM 진입점, 컴포넌트별 파일, 타입 선언, 토큰 CSS 가 있다.
// 2. Button 하나만 가져온 번들에 다른 컴포넌트(Sparkline, Table, Dropdown)의 코드가 없다(tree-shaking).
// 3. 의존(react, floating-ui)은 번들 안에 들어가지 않고 import 로 남는다.
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const fail = (msg) => {
  console.error(`check:lib 실패: ${msg}`);
  process.exit(1);
};

for (const file of [
  'index.js',
  'Button.js',
  'Table.js',
  'Sparkline.js',
  'types/index.d.ts',
  'types/Button.d.ts',
  'tokens.css',
]) {
  if (!existsSync(path.join(dist, file))) fail(`dist/${file} 가 없다`);
}

const work = mkdtempSync(path.join(tmpdir(), 'everp-ui-check-'));
const entry = path.join(work, 'entry.js');
writeFileSync(
  entry,
  `import { Button } from ${JSON.stringify(path.join(dist, 'index.js'))};\nexport default Button;\n`,
);

const result = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    write: false,
    minify: false,
    lib: { entry, formats: ['es'], fileName: 'out' },
    rollupOptions: { external: (id) => !id.startsWith('.') && !path.isAbsolute(id) },
  },
});
rmSync(work, { recursive: true, force: true });

const outputs = Array.isArray(result) ? result : [result];
const code = outputs
  .flatMap((o) => o.output)
  .map((chunk) => ('code' in chunk ? chunk.code : ''))
  .join('\n');

// 다른 컴포넌트 파일에만 있는 표식
const leaks = [
  ['Sparkline', 'polyline'],
  ['UiText', '잠시만 기다려주세요'],
  ['Table', 'isStale'],
  ['Dropdown', 'useListNavigation'],
].filter(([, marker]) => code.includes(marker));
if (leaks.length) fail(`Button 만 가져왔는데 ${leaks.map(([n]) => n).join(', ')} 코드가 들어왔다`);
if (!/from ["']react\/jsx-runtime["']/.test(code))
  fail('react/jsx-runtime 이 import 로 남지 않았다(번들에 들어갔다)');

const kb = (Buffer.byteLength(code) / 1024).toFixed(1);
console.log(
  `check:lib 통과. Button 만 가져온 번들 ${kb}KB(압축 전), 다른 컴포넌트 코드 없음, react 는 외부 import`,
);
