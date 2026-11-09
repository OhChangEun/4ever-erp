/**
 * 손으로 쓴 응답, 요청 타입 선언을 OpenAPI 생성 타입의 별칭으로 바꾼다(OpenAPI 계약 2 카드, 두 번째 단계).
 * api-to-openapi.mts 가 남긴 `.openapi-map.json`(파일, 선언 이름, 스키마 이름)을 읽는다.
 *
 *   npx -y tsx@4.20.6 scripts/codemods/types-to-aliases.mts
 *
 * - 제네릭 선언은 건너뛴다(스키마는 인스턴스마다 펼쳐져 있다).
 * - 선언 앞의 주석은 남긴다. 선언만 `export type X = Schema<'X'>;` 로 바꾼다.
 * - 바꾼 뒤 `tsc` 가 통과해야 끝이다. 못 바꾼 것은 목록으로 찍는다.
 */
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const rows: { file: string; name: string; schema: string }[] = JSON.parse(
  readFileSync(path.join(ROOT, 'scripts/codemods/.openapi-map.json'), 'utf8'),
);

const IMPORT = "import type { Schema } from '@/lib/api/contract';\n";
const byFile = new Map<string, { name: string; schema: string }[]>();
for (const row of rows) byFile.set(row.file, [...(byFile.get(row.file) ?? []), row]);

let replaced = 0;
const skipped: string[] = [];

for (const [file, targets] of byFile) {
  // 계약 생성 타입 자신과 contract.ts 는 건드리지 않는다
  if (file.endsWith('openapi.gen.ts') || file.endsWith('lib/api/contract.ts')) continue;
  const full = path.join(ROOT, file);
  let text = readFileSync(full, 'utf8');
  const source = ts.createSourceFile(full, text, ts.ScriptTarget.Latest, true);
  const edits: { start: number; end: number; text: string }[] = [];

  for (const { name, schema } of targets) {
    const decl = source.statements.find(
      (s): s is ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
        (ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) && s.name.text === name,
    );
    if (!decl) {
      skipped.push(`${file} ${name}: 선언을 못 찾음`);
      continue;
    }
    if (decl.typeParameters?.length) {
      skipped.push(`${file} ${name}: 제네릭`);
      continue;
    }
    const exported = decl.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    edits.push({
      start: decl.getStart(source), // 앞 주석은 남긴다
      end: decl.getEnd(),
      text: `${exported ? 'export ' : ''}type ${name} = Schema<'${schema}'>;`,
    });
  }

  if (edits.length === 0) continue;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  }
  if (!text.includes("from '@/lib/api/contract'")) text = IMPORT + text;
  writeFileSync(full, text);
  replaced += edits.length;
}

console.log(`별칭으로 바꾼 선언 ${replaced}개, 건너뜀 ${skipped.length}개`);
if (skipped.length) console.log(skipped.join('\n'));
