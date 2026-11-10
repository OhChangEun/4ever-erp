'use client';

import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import type { NodeProps, LinkProps } from 'recharts/types/chart/Sankey';
import { compactWon, formatCurrency } from '@/app/utils/number';
import { longestDepths } from '../../supplyFlow';

type ChartNode = { name: string; kind: 'flow' | 'drop' };
type ChartLink = { source: number; target: number; value: number };

const FILL = { flow: 'var(--color-blue-500)', drop: 'var(--color-gray-400)' } as const;
const STROKE = { flow: 'var(--color-blue-200)', drop: 'var(--color-gray-300)' } as const;

/**
 * 자재 흐름 Sankey(시각화 6). 본 흐름은 브랜드 색, 새는 흐름은 회색. 노드 옆에 이름과 금액을 직접 적는다.
 * align left 라 새는 노드(반려 등)는 제 단계 옆에 선다. 마지막 단계 노드만 라벨을 왼쪽에(오른쪽 끝에서 잘리지 않게).
 * Recharts 의 sourceLinks 는 들어오는 흐름, targetLinks 는 나가는 흐름이다. 이 파일은 SupplyFlow 가 동적으로만 가져온다.
 */
export default function SupplyFlowChart({
  nodes,
  links,
  describedBy,
}: {
  nodes: ChartNode[];
  links: ChartLink[];
  describedBy: string;
}) {
  const kindOf = (index: number) => nodes[index]?.kind ?? 'flow';
  const maxDepth = Math.max(0, ...longestDepths(nodes.length, links));

  const renderNode = ({ x, y, width, height, index, payload }: NodeProps) => {
    const sink = payload.targetLinks.length === 0 && payload.depth === maxDepth;
    const kind = kindOf(index);
    const value = typeof payload.value === 'number' ? payload.value : 0;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={FILL[kind]} rx={1} />
        <text
          x={sink ? x - 6 : x + width + 6}
          y={y + height / 2}
          textAnchor={sink ? 'end' : 'start'}
          dominantBaseline="middle"
          fontSize={11}
          fill="var(--color-gray-700)"
        >
          {payload.name} {compactWon(value)}
        </text>
      </g>
    );
  };

  const renderLink = (p: LinkProps) => {
    const target = links[p.index]?.target ?? 0;
    return (
      <path
        d={`M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`}
        fill="none"
        stroke={STROKE[kindOf(target)]}
        strokeWidth={Math.max(1, p.linkWidth)}
        strokeOpacity={0.7}
      />
    );
  };

  return (
    <div role="img" aria-label="자재 흐름 차트" aria-describedby={describedBy} className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={{ nodes, links }}
          nodeWidth={10}
          nodePadding={24}
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          node={renderNode}
          link={renderLink}
          sort={false}
          align="left"
        >
          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
