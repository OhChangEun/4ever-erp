// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ESLint, Linter } from 'eslint';

/**
 * 남은 표시 결함 3 카드. 인자 없는 toLocaleString(), toLocaleDateString(), toLocaleTimeString() 은
 * 브라우저 언어를 따라 화면 언어와 어긋난다.
 * 실제 eslint.config.mjs 가 그 파일에 적용하는 no-restricted-syntax 설정을 꺼내 글자를 린트한다.
 * ESLint 로 바로 린트하지 않는 이유: 타입 정보 규칙이 TS 프로젝트를 띄워 첫 호출이 4초를 넘는다(verify 에서 시간 초과).
 */
const eslint = new ESLint({ cwd: process.cwd() });
const linter = new Linter({ configType: 'flat' });

const restricted = async (code: string, filePath: string) => {
  const config: { rules: Record<string, Linter.RuleEntry> } =
    await eslint.calculateConfigForFile(filePath);
  return linter.verify(code, {
    rules: { 'no-restricted-syntax': config.rules['no-restricted-syntax'] },
  });
};

const SOURCE = 'src/app/utils/number.ts';
const TEST = 'src/app/utils/number.test.ts';

describe('인자 없는 toLocale*String 금지', () => {
  it.each(['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'])(
    '%s() 는 error',
    async (method) => {
      const messages = await restricted(`export const text = new Date().${method}();\n`, SOURCE);
      expect(messages).toHaveLength(1);
      expect(messages[0].severity).toBe(2);
    },
  );

  // 리뷰 P2: 문자열로 접근하면 AST 가 property.name 이 아니라 property.value 다
  it.each([
    ["x['toLocaleString']()", '문자열 접근'],
    ["x?.['toLocaleDateString']()", '문자열 접근(옵셔널)'],
    ['x.toLocaleString(undefined)', 'undefined 를 넘김'],
    ['x.toLocaleString(undefined, { maximumFractionDigits: 1 })', 'undefined 와 옵션'],
    ["x['toLocaleTimeString'](undefined)", '문자열 접근에 undefined'],
  ])('%s 도 error (%s)', async (call) => {
    const messages = await restricted(`export const text = (x) => ${call};\n`, SOURCE);
    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
  });

  it.each([
    "x.toLocaleString('ko-KR')",
    'x.toLocaleString(locale, { maximumFractionDigits: 1 })',
    'x.toLocaleUpperCase()',
    "x['toString']()",
  ])('%s 는 막지 않는다', async (call) => {
    expect(await restricted(`export const text = (x, locale) => ${call};\n`, SOURCE)).toEqual([]);
  });

  it('언어를 넘기면 통과한다', async () => {
    const code = 'export const text = (n, locale) => n.toLocaleString(locale);\n';
    expect(await restricted(code, SOURCE)).toEqual([]);
  });

  it('테스트 파일은 제외한다', async () => {
    expect(await restricted('export const text = (1200).toLocaleString();\n', TEST)).toEqual([]);
  });

  it('UTC 날짜 자르기는 테스트 파일에서도 계속 막는다', async () => {
    const code = "export const day = new Date().toISOString().split('T')[0];\n";
    expect(await restricted(code, SOURCE)).toHaveLength(1);
    expect(await restricted(code, TEST)).toHaveLength(1);
  });
});
