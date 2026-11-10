import { hierarchy, tree } from 'd3';
import type { TreeNode } from './bomTreeUtils';

export const NODE_W = 168;
export const NODE_H = 64;
/** 같은 깊이 노드 사이(세로) */
const GAP_BREADTH = 14;
/** 깊이 사이(가로). 접힘 글자가 들어갈 자리 */
const GAP_DEPTH = 56;
const PAD = 12;
/** 상자 오른쪽 "하위 N개 접힘" 글자 자리(11px, 두 자리 수까지). 상자와 6px 띄운다 */
export const COLLAPSED_LABEL_GAP = 6;
const COLLAPSED_LABEL_W = 96;

export interface LayoutNode {
  id: string;
  /** 노드 상자의 왼쪽 위 */
  x: number;
  y: number;
  depth: number;
  data: TreeNode;
  hasChildren: boolean;
  collapsed: boolean;
  /** 접혀서 안 보이는 하위 노드 수(모든 깊이) */
  hiddenCount: number;
}

const countDescendants = (n: TreeNode): number =>
  (n.children ?? []).reduce((sum, c) => sum + 1 + countDescendants(c), 0);

/**
 * BOM 트리 배치(시각화 7). D3 는 좌표만 계산하고 그리기는 React 가 한다(간트와 같은 방식).
 * 왼쪽에서 오른쪽으로 펼친다(깊이는 가로, 형제는 세로). 자재가 많아도 모달 폭(깊이 3, 약 700px)에 들어간다.
 * 접은 노드의 하위는 배치에서 뺀다. 좌표는 0 이상으로 옮겨 SVG 크기를 바로 쓸 수 있다.
 */
export const bomLayout = (root: TreeNode, collapsed: ReadonlySet<string>) => {
  const h = hierarchy(root, (n) => (collapsed.has(n.id) ? undefined : n.children));
  // d3.tree 의 x 는 형제 방향, y 는 깊이 방향이다. 화면에서는 y 를 가로로 쓴다
  const laid = tree<TreeNode>().nodeSize([NODE_H + GAP_BREADTH, NODE_W + GAP_DEPTH])(h);
  const all = laid.descendants();
  const minB = Math.min(...all.map((d) => d.x));
  const maxB = Math.max(...all.map((d) => d.x));
  const toX = (depthPos: number) => depthPos + PAD;
  const toY = (breadthPos: number) => breadthPos - minB + PAD;

  const nodes: LayoutNode[] = all.map((d) => {
    const hasChildren = (d.data.children?.length ?? 0) > 0;
    const isCollapsed = hasChildren && collapsed.has(d.data.id);
    return {
      id: d.data.id,
      x: toX(d.y),
      y: toY(d.x),
      depth: d.depth,
      data: d.data,
      hasChildren,
      collapsed: isCollapsed,
      hiddenCount: isCollapsed ? countDescendants(d.data) : 0,
    };
  });

  const links = laid.links().map((l) => ({
    id: `${l.source.data.id}-${l.target.data.id}`,
    x1: toX(l.source.y) + NODE_W,
    y1: toY(l.source.x) + NODE_H / 2,
    x2: toX(l.target.y),
    y2: toY(l.target.x) + NODE_H / 2,
  }));

  // 접힘 글자가 상자 오른쪽에 붙는다. 맨 오른쪽 깊이의 노드를 접어도 잘리지 않게 글자 폭까지 잡는다(리뷰 P2)
  const right = Math.max(
    ...nodes.map((n) => n.x + NODE_W + (n.collapsed ? COLLAPSED_LABEL_GAP + COLLAPSED_LABEL_W : 0)),
  );
  return { nodes, links, width: right + PAD, height: maxB - minB + NODE_H + PAD * 2 };
};
