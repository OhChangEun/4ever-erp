import { describe, expect, it } from 'vitest';
import { rollupBomCost } from './bomCost';
import type { TreeNode } from './bomTreeUtils';

const leaf = (id: string, quantity: number, unitCost?: number): TreeNode => ({
  id,
  name: id,
  code: id,
  quantity,
  unit: 'EA',
  level: 2,
  unitCost,
});

const tree: TreeNode = {
  id: 'root',
  name: '모터',
  code: 'P',
  level: 0,
  children: [
    {
      id: 'asm',
      name: '조립',
      code: 'A',
      quantity: 2,
      unit: 'EA',
      level: 1,
      children: [leaf('a', 3, 100), leaf('b', 1, 400)],
    },
    leaf('c', 1, 300),
  ],
};

describe('rollupBomCost', () => {
  it('1단위 원가는 하위 수량 × 1단위 원가의 합, 기여는 경로 수량 곱', () => {
    const r = rollupBomCost(tree);
    // 조립 1개 = 3×100 + 1×400 = 700, 완제품 = 2×700 + 1×300 = 1700
    expect(r.byId.get('asm')).toMatchObject({ unitCost: 700, contribution: 1400, partial: false });
    expect(r.byId.get('a')).toMatchObject({ unitCost: 100, contribution: 600 });
    expect(r.total).toBe(1700);
    expect(r.byId.get('c')?.share).toBe(18);
    expect(r.byId.get('root')?.share).toBe(100);
  });

  it('비중 큰 자재(잎)를 기여 순으로', () => {
    expect(rollupBomCost(tree).materials.map((m) => m.id)).toEqual(['b', 'a', 'c']);
  });

  it('단가 없는 자재는 0 으로 세지 않고 위로 "이상"을 올린다', () => {
    const t: TreeNode = { ...tree, children: [tree.children?.[0] ?? leaf('x', 1), leaf('c', 1)] };
    const r = rollupBomCost(t);
    expect(r.byId.get('c')).toMatchObject({ unitCost: null, contribution: null, missing: true });
    expect(r.byId.get('root')).toMatchObject({ unitCost: 1400, partial: true });
    expect(r.byId.get('asm')?.partial).toBe(false);
    expect(r.missingCount).toBe(1);
  });
});
