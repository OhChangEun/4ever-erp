import { describe, expect, it } from 'vitest';
import { toKeyValueItems } from './options';

describe('옵션 응답을 화면 옵션으로', () => {
  it('key 와 value 만 옮기고 서버가 더 보낸 필드는 버린다', () => {
    expect(toKeyValueItems([{ key: 'A', value: '가', extra: 1 } as never])).toEqual([
      { key: 'A', value: '가' },
    ]);
  });
});
