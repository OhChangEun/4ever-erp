import { describe, expect, it } from 'vitest';
import ko from './messages/ko.json';
import en from './messages/en.json';

/** 메시지 키를 모은다(중첩은 점으로) */
const keysOf = (tree: object, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]: [string, unknown]) =>
    typeof value === 'object' && value !== null
      ? keysOf(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

describe('언어별 메시지(i18n 1)', () => {
  it('ko 와 en 의 키가 같다(한쪽에만 있는 문구가 없다)', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(ko).sort());
  });

  it('빈 문구가 없다', () => {
    const empty = (tree: object) =>
      keysOf(tree).filter((key) => {
        const value: unknown = key
          .split('.')
          .reduce<unknown>(
            (node, part) =>
              typeof node === 'object' && node !== null ? Reflect.get(node, part) : undefined,
            tree,
          );
        return typeof value !== 'string' || value.trim() === '';
      });
    expect(empty(ko)).toEqual([]);
    expect(empty(en)).toEqual([]);
  });
});
