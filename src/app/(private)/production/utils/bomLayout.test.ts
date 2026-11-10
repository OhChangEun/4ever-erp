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
  it('노드 좌표는 0 이상이고 깊이마다 오른쪽으로 간다(가로 트리)', () => {
    const l = bomLayout(tree, new Set());
    expect(l.nodes.map((n) => n.id)).toEqual(['r', 'a', 'b', 'a1', 'a2']);
    for (const n of l.nodes) expect(n.x).toBeGreaterThanOrEqual(0);
    for (const n of l.nodes) expect(n.y).toBeGreaterThanOrEqual(0);
    const x = Object.fromEntries(l.nodes.map((n) => [n.id, n.x]));
    expect(x.a).toBeGreaterThan(x.r);
    expect(x.a1).toBeGreaterThan(x.a);
    expect(x.a).toBe(x.b);
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

  it('맨 오른쪽 노드를 접어도 접힘 글자 자리까지 폭을 잡는다', () => {
    const l = bomLayout(tree, new Set(['r']));
    const root = l.nodes[0];
    expect(l.width).toBeGreaterThanOrEqual(root.x + 168 + 6 + 96);
  });
});
