import { describe, expect, it } from 'vitest';
import { buildBomTree } from './buildBomTree';

describe('buildBomTree', () => {
  it('빈 입력이면 트리도 오류도 없다', () => {
    expect(buildBomTree([])).toEqual({ treeData: null, error: null });
  });

  it('노드를 트리로 만든다', () => {
    const result = buildBomTree([
      { id: 'p', code: 'P', name: '완제품', quantity: 1, unit: 'EA', level: 0, parentId: '' },
      { id: 'c', code: 'C', name: '부품', quantity: 2, unit: 'EA', level: 1, parentId: 'p' },
    ]);
    expect(result.error).toBeNull();
    expect(result.treeData?.name).toBe('완제품');
  });
});
