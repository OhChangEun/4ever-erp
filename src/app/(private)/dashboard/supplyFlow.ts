import type { FlowLink, FlowNode } from './types/SupplyFlowType';

/** 값이 있고 양 끝 노드를 아는 흐름만. 나머지는 센다(그럴듯하게 그리지 않는다, 시각화 6 완료 기준 4) */
const validLinks = (nodes: FlowNode[], links: FlowLink[]) => {
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const valid: { source: number; target: number; value: number }[] = [];
  let unknown = 0;
  for (const l of links) {
    const source = index.get(l.source);
    const target = index.get(l.target);
    if (source === undefined || target === undefined || l.value <= 0) {
      unknown += 1;
      continue;
    }
    valid.push({ source, target, value: l.value });
  }
  return { valid, unknown };
};

/**
 * 위상 순서(Kahn). 순환에 걸린 노드는 순서에 못 들어간다. 그래서 order 길이가 노드 수보다 짧으면 순환이다.
 * Recharts Sankey 는 순환이 있으면 깊이를 못 정하므로 그리기 전에 막는다.
 */
const topoOrder = (count: number, links: { source: number; target: number }[]) => {
  const indegree = Array.from({ length: count }, () => 0);
  for (const l of links) indegree[l.target] += 1;
  const queue = indegree.flatMap((d, i) => (d === 0 ? [i] : []));
  const order: number[] = [];
  while (queue.length > 0) {
    const i = queue.shift() ?? 0;
    order.push(i);
    for (const l of links) {
      if (l.source !== i) continue;
      indegree[l.target] -= 1;
      if (indegree[l.target] === 0) queue.push(l.target);
    }
  }
  return order;
};

/** 노드마다 시작에서 가장 긴 경로의 단계 수(Recharts 의 align left 깊이와 같다). 순환이면 순환 노드는 0 */
export const longestDepths = (count: number, links: { source: number; target: number }[]) => {
  const depth = Array.from({ length: count }, () => 0);
  for (const i of topoOrder(count, links))
    for (const l of links)
      if (l.source === i) depth[l.target] = Math.max(depth[l.target], depth[i] + 1);
  return depth;
};

/** 계약의 id 흐름을 Recharts Sankey 의 인덱스 흐름으로 */
export const toSankeyData = (nodes: FlowNode[], links: FlowLink[]) => {
  const { valid, unknown } = validLinks(nodes, links);
  const cyclic = topoOrder(nodes.length, valid).length < nodes.length;
  return {
    nodes: nodes.map((n) => ({ name: n.name, kind: n.kind })),
    links: valid,
    unknown,
    cyclic,
  };
};

const percent = (part: number, whole: number) => Math.round((part / whole) * 100);

/**
 * 요약. 본 흐름 노드마다 지나간 금액(들어온 것과 나간 것 중 큰 쪽)을 흐름 순서로,
 * 새는 노드(kind drop)로 들어간 금액 합계와 시작 금액(들어온 흐름이 없는 노드들) 대비 비율.
 */
export const flowSummary = (nodes: FlowNode[], links: FlowLink[]) => {
  const { valid } = validLinks(nodes, links);
  const inflow = nodes.map(() => 0);
  const outflow = nodes.map(() => 0);
  for (const l of valid) {
    outflow[l.source] += l.value;
    inflow[l.target] += l.value;
  }
  const order = topoOrder(nodes.length, valid);
  const rest = nodes.map((_, i) => i).filter((i) => !order.includes(i));
  const stages = [...order, ...rest]
    .filter((i) => nodes[i].kind === 'flow' && inflow[i] + outflow[i] > 0)
    .map((i) => ({ id: nodes[i].id, name: nodes[i].name, value: Math.max(inflow[i], outflow[i]) }));
  const dropped = nodes.reduce((sum, n, i) => sum + (n.kind === 'drop' ? inflow[i] : 0), 0);
  const start = nodes.reduce((sum, _, i) => sum + (inflow[i] === 0 ? outflow[i] : 0), 0);
  // 순환만 있어 시작 노드가 없으면 비율의 분모가 없다. 0% 라고 말하지 않는다(리뷰 P2)
  return { stages, dropped, dropRate: start > 0 ? percent(dropped, start) : null };
};
