// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  DYNAMIC_PREFIXES,
  findStalePrefixes,
  findUnneededPrefixes,
  findUnusedMessages,
  messageKeys,
  scanSource,
  stalePrefixes,
  unusedKeys,
} from '../../scripts/unused-messages.mjs';

const GUIDE =
  '키를 동적으로 만들면 scripts/unused-messages.mjs 의 DYNAMIC_PREFIXES 에 접두사와 파일을 적는다. ' +
  '안 쓰는 키면 ko, en 에서 같이 지운다. 목록은 `node scripts/unused-messages.mjs`';

describe('안 쓰는 메시지 키(죽은 코드 정리 카드)', () => {
  it('코드에서 안 쓰는 키가 없다. 화면을 지우면 그 화면만 쓰던 키도 ko, en 에서 같이 지운다', () => {
    expect(findUnusedMessages(), GUIDE).toEqual([]);
  });

  it('동적 접두사마다 그 아래 키가 하나 이상 있다', () => {
    const keys = messageKeys();
    expect(
      DYNAMIC_PREFIXES.filter(({ prefix }) => !keys.some((key) => key.startsWith(prefix))).map(
        ({ prefix }) => prefix,
      ),
      GUIDE,
    ).toEqual([]);
  });

  it('동적 접두사마다 적힌 파일이 있고 그 파일이 그 접두사로 키를 만든다(낡은 접두사가 없다)', () => {
    expect(findStalePrefixes(), GUIDE).toEqual([]);
  });

  it('필요 없는 동적 접두사가 없다(빼도 안 쓴다고 잡히는 키가 없으면 접두사가 너무 넓다)', () => {
    expect(findUnneededPrefixes(), GUIDE).toEqual([]);
  });

  it('판정: 전체 키 리터럴, 같은 파일의 namespace 와 나머지, 동적 접두사는 쓴 것으로 본다', () => {
    const keys = ['a.full', 'a.b.split', 'a.b.otherFile', 'dyn.x', 'a.unused'];
    const files = [
      scanSource('one.tsx', "t('a.full'); useTranslations('a.b'); t('split');"),
      scanSource('two.tsx', "t('otherFile');"),
    ];
    // otherFile 은 namespace 리터럴(a.b)과 다른 파일에만 있어 안 쓴 것으로 본다
    expect(unusedKeys(keys, files, ['dyn.'])).toEqual(['a.b.otherFile', 'a.unused']);
  });

  it('판정: 같은 파일의 템플릿 머리와 리터럴로 만드는 키는 쓴 것으로 본다(ProcessDetailModal 모양)', () => {
    const keys = ['prod.process.startOk', 'prod.process.title', 'role.ADMIN', 'role.GONE'];
    const files = [
      scanSource(
        'modal.tsx',
        "const t = useTranslations('prod'); set({ key: 'startOk' }); t(`process.${m.key}`);",
      ),
      scanSource('label.tsx', "const k = 'ADMIN'; t(`role.${k}`);"),
    ];
    expect(unusedKeys(keys, files, [])).toEqual(['prod.process.title', 'role.GONE']);
  });

  it('낡은 접두사: 적힌 화면 파일을 지웠거나 그 파일에 그 접두사로 키를 만드는 곳이 없으면 잡는다', () => {
    const entries = [
      { prefix: 'prod.process.', files: ['modal.tsx'] },
      { prefix: 'sales.tabs.', files: ['tabs.tsx'] },
      { prefix: 'status.', files: ['label.tsx'] },
      { prefix: 'fin.stats.', files: ['client.tsx'] },
    ];
    const sources = new Map([
      // modal.tsx 는 지운 상황
      ['tabs.tsx', scanSource('tabs.tsx', "useTranslations('sales'); t('title');")],
      ['label.tsx', scanSource('label.tsx', "const t = useTranslations('status'); t(code);")],
      ['client.tsx', scanSource('client.tsx', "useTranslations('fin'); t(`stats.${c.title}`);")],
    ]);
    expect(stalePrefixes(entries, sources)).toEqual([
      'prod.process.: modal.tsx 가 없다',
      'sales.tabs.: tabs.tsx 에 이 접두사로 키를 만드는 곳이 없다',
    ]);
  });
});
