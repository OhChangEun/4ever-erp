import { describe, expect, it } from 'vitest';
import { buildBomTree } from './buildBomTree';
import { rollupBomCost } from './bomCost';

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

  it('입력 행 순서와 무관하게 같은 부모 아래의 자재를 코드 순서로 연결한다', () => {
    const root = {
      id: 'p',
      code: 'P',
      name: '완제품',
      level: 0,
      parentId: null,
      quantity: 1,
      unit: 'EA',
    };
    const assembly = { ...root, id: 'a', code: 'A', name: '조립품', level: 1, parentId: 'p' };
    const part = {
      ...assembly,
      id: 'b',
      code: 'B',
      name: '판재',
      quantity: 3,
      unit: 'kg',
      unitCost: null,
    };
    const bolt = {
      ...part,
      id: 's',
      code: 'S',
      name: '볼트',
      level: 2,
      parentId: 'a',
      unitCost: 120,
    };
    const { treeData, error } = buildBomTree([bolt, part, root, assembly]);
    expect(error).toBeNull();
    expect(treeData?.children?.map((n) => n.id)).toEqual(['a', 'b']);
    expect(treeData?.children?.[0].children).toEqual([
      expect.objectContaining({
        id: 's',
        quantity: 3,
        unit: 'kg',
        unitCost: 120,
      }),
    ]);
    expect(treeData?.children?.[1]).toMatchObject({
      id: 'b',
      quantity: 3,
      unit: 'kg',
      unitCost: null,
    });
    expect(treeData?.children?.[0].children?.[0].children).toBeUndefined();
    expect(treeData?.children?.[1].children).toBeUndefined();
  });

  it('루트를 찾지 못하면 변환 오류를 표시한다', () => {
    const orphan = {
      id: 'a',
      code: 'A',
      name: '자재',
      level: 1,
      parentId: 'missing',
      quantity: 1,
      unit: 'EA',
    };
    expect(buildBomTree([orphan])).toEqual({ treeData: null, error: 'convert' });
  });

  it('서버가 수량 0을 보내면 표시 수량과 완제품 원가 기여가 모두 0이다', () => {
    const base = {
      id: 'p',
      code: 'P',
      name: '완제품',
      quantity: 1,
      unit: 'EA',
      level: 0,
      parentId: null,
    };
    const part = {
      ...base,
      id: 'c',
      code: 'C',
      name: '볼트',
      quantity: 0,
      level: 1,
      parentId: 'p',
      unitCost: 120,
    };
    const { treeData } = buildBomTree([base, part]);
    expect(treeData?.children?.[0].quantity).toBe(0);
    expect(treeData && rollupBomCost(treeData).total).toBe(0);
  });
});
