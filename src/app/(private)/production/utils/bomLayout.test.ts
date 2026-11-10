import { describe, expect, it } from 'vitest';
import { bomLayout } from './bomLayout';
import type { TreeNode } from './bomTreeUtils';

const node = (id: string, children?: TreeNode[]): TreeNode => ({
  id,
  name: id,
  code: id,
  level: 0,
  children,
});
const tree = node('r', [node('a', [node('a1'), node('a2')]), node('b')]);

describe('bomLayout', () => {
  it('노드 좌표는 0 이상이고 깊이마다 아래로 간다', () => {
    const l = bomLayout(tree, new Set());
    expect(l.nodes.map((n) => n.id)).toEqual(['r', 'a', 'b', 'a1', 'a2']);
    for (const n of l.nodes) expect(n.x).toBeGreaterThanOrEqual(0);
    const y = Object.fromEntries(l.nodes.map((n) => [n.id, n.y]));
    expect(y.a).toBeGreaterThan(y.r);
    expect(y.a1).toBeGreaterThan(y.a);
    expect(l.links).toHaveLength(4);
    expect(l.width).toBeGreaterThan(0);
  });

  it('접은 노드의 하위는 빼고, 접힌 하위 수를 붙인다', () => {
    const l = bomLayout(tree, new Set(['a']));
    expect(l.nodes.map((n) => n.id)).toEqual(['r', 'a', 'b']);
    expect(l.nodes.find((n) => n.id === 'a')).toMatchObject({
      collapsed: true,
      hiddenCount: 2,
      hasChildren: true,
    });
    expect(l.links).toHaveLength(2);
  });
});
