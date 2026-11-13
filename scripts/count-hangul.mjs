// 화면 코드에 남은 한국어 문자열 수(i18n 1 카드). 다음 i18n 카드가 이 수를 줄인다.
// 주석은 세지 않는다. 문자열, 템플릿 문자열, JSX 글자 중 한글이 있는 것만. 테스트, 목, 생성 파일은 뺀다.
// 실행: node scripts/count-hangul.mjs [--json]
// 화면 파일의 남은 문자열은 src/i18n/hangulStrings.test.ts 가 예외 목록과 맞춘다(남은 한국어 문자열 카드).
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const SKIP = [
  /\.test\.tsx?$/,
  /\.stories\.tsx?$/,
  /^src\/mocks\//,
  /^src\/test\//,
  /openapi\.gen\.ts$/,
  /^src\/i18n\//,
];
const HANGUL = /[가-힣]/;

/** 폴더 아래(또는 파일 하나) .ts, .tsx (저장소 기준 `/` 경로, SKIP 제외) */
const sourceFiles = (root) => {
  if (!statSync(path.join(REPO, root)).isDirectory()) return [root];
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(path.join(REPO, dir))) {
      const rel = path.posix.join(dir, name);
      if (statSync(path.join(REPO, rel)).isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(name) && !SKIP.some((re) => re.test(rel))) files.push(rel);
    }
  };
  walk(root);
  return files;
};

/**
 * 폴더들 아래 한글이 든 문자열 하나하나
 * @param {string[]} roots 저장소 기준 폴더
 * @returns {{ files: number; strings: { file: string; line: number; text: string }[] }}
 */
export const hangulStrings = (roots) => {
  const files = roots.flatMap(sourceFiles);
  const strings = [];
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(path.join(REPO, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node) => {
      if (
        (ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node) ||
          ts.isJsxText(node) ||
          ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) ||
          ts.isTemplateTail(node)) &&
        HANGUL.test(node.text)
      ) {
        const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        strings.push({ file, line, text: node.text.trim() });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { files: files.length, strings };
};

// CLI 로 불렸을 때만 실행
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { files, strings } = hangulStrings(['src']);
  const counts = new Map();
  for (const { file } of strings) {
    // 도메인(라우트 그룹 아래 첫 폴더) 단위로 묶는다
    const match = file.match(/^src\/app\/\((?:private|public)\)\/([^/]+)/);
    const area = match ? match[1] : file.split('/').slice(0, 3).join('/');
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = strings.length;
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ total, byArea: Object.fromEntries(rows) }, null, 2));
  } else {
    console.log(`한국어 문자열 ${total}개(파일 ${files}개 중)`);
    for (const [area, n] of rows) console.log(`${String(n).padStart(5)}  ${area}`);
  }
}
