// 화면 코드에 남은 한국어 문자열 수(i18n 1 카드). 다음 i18n 카드가 이 수를 줄인다.
// 주석은 세지 않는다. 문자열, 템플릿 문자열, JSX 글자 중 한글이 있는 것만. 테스트, 목, 생성 파일은 뺀다.
// 실행: node scripts/count-hangul.mjs [--json]
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const SKIP = [
  /\.test\.tsx?$/,
  /\.stories\.tsx?$/,
  /^src\/mocks\//,
  /^src\/test\//,
  /openapi\.gen\.ts$/,
  /^src\/i18n\//,
];
const HANGUL = /[가-힣]/;

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.tsx?$/.test(name) && !SKIP.some((re) => re.test(full))) files.push(full);
  }
};
walk(ROOT);

const counts = new Map();
let total = 0;
for (const file of files) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  let n = 0;
  const visit = (node) => {
    if (
      (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isJsxText(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)) &&
      HANGUL.test(node.text)
    )
      n += 1;
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (n === 0) continue;
  // 도메인(라우트 그룹 아래 첫 폴더) 단위로 묶는다
  const match = file.match(/^src\/app\/\((?:private|public)\)\/([^/]+)/);
  const area = match ? match[1] : file.split('/').slice(0, 3).join('/');
  counts.set(area, (counts.get(area) ?? 0) + n);
  total += n;
}

const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ total, byArea: Object.fromEntries(rows) }, null, 2));
} else {
  console.log(`한국어 문자열 ${total}개(파일 ${files.length}개 중)`);
  for (const [area, n] of rows) console.log(`${String(n).padStart(5)}  ${area}`);
}
