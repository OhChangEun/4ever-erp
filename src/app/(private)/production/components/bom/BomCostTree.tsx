'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { formatCurrency } from '@/app/utils/number';
import { buildBomTree } from '../../utils/buildBomTree';
import { rollupBomCost, type NodeCost } from '../../utils/bomCost';
import {
  bomLayout,
  COLLAPSED_LABEL_GAP,
  NODE_H,
  NODE_W,
  type LayoutNode,
} from '../../utils/bomLayout';
import type { TreeNode } from '../../utils/bomTreeUtils';
import type { BomLevelStructureNode } from '../../types/BomDetailApiType';

/** 비중 4단계 색(시각화 7 결정 1). 비중을 모르면 흰색 */
const shareFill = (share: number | null) => {
  if (share === null) return 'white';
  if (share < 5) return 'var(--color-blue-50)';
  if (share < 15) return 'var(--color-blue-100)';
  if (share < 30) return 'var(--color-blue-200)';
  return 'var(--color-blue-300)';
};

const MAX_NAME = 12;
const shortName = (name: string) => (name.length > MAX_NAME ? `${name.slice(0, MAX_NAME)}…` : name);
const qtyText = (n: TreeNode, depth: number) =>
  depth === 0 ? '완제품' : `${n.quantity ?? 1}${n.unit ?? ''}`;
const costText = (c: NodeCost | undefined) => {
  if (!c || c.missing) return '단가 없음';
  if (c.contribution === null) return '원가 모름';
  return `${formatCurrency(c.contribution)}${c.partial ? ' 이상' : ''}${c.share === null ? '' : `(${c.share}%)`}`;
};

/**
 * BOM 트리와 자재 원가 롤업(시각화 7). D3 는 bomLayout 에서 좌표만 계산하고 여기서 React 가 SVG 를 그린다.
 * 하위가 있는 노드는 버튼이라 눌러서(Enter, Space 도) 접고 편다. 단가 없는 자재는 0 원으로 세지 않는다.
 */
export default function BomCostTree({ bomData }: { bomData: BomLevelStructureNode[] }) {
  const summaryId = useId();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [showTable, setShowTable] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const { treeData, error } = useMemo(() => buildBomTree(bomData), [bomData]);
  const cost = useMemo(() => (treeData ? rollupBomCost(treeData) : null), [treeData]);
  const layout = useMemo(
    () => (treeData ? bomLayout(treeData, collapsed) : null),
    [treeData, collapsed],
  );

  if (error) return <TableStatusBox type="error" message={error} />;
  if (!treeData || !cost || !layout)
    return <TableStatusBox type="empty" message="BOM 데이터가 없습니다." />;

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggle(id);
  };

  const labelOf = (n: LayoutNode) => {
    const c = cost.byId.get(n.id);
    const state = n.collapsed
      ? `하위 ${n.hiddenCount}개 접힘`
      : `하위 ${n.data.children?.length ?? 0}개 펼침`;
    return `${n.data.name}, ${qtyText(n.data, n.depth)}, 완제품 1개당 ${costText(c)}, ${state}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-3" aria-hidden="true">
          비중
          {[2, 10, 20, 40].map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <svg width={12} height={12}>
                <rect
                  width={12}
                  height={12}
                  rx={2}
                  fill={shareFill(s)}
                  stroke="var(--color-gray-300)"
                />
              </svg>
              {['5% 미만', '5~15%', '15~30%', '30% 이상'][i]}
            </span>
          ))}
          <span>하위가 있는 상자를 누르면 접고 폅니다.</span>
        </span>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="text-sm text-blue-600 hover:underline cursor-pointer"
        >
          {showTable ? '트리로 보기' : '표로 보기'}
        </button>
      </div>

      {showTable ? (
        <CostTable root={treeData} cost={cost.byId} />
      ) : (
        <div className="max-h-[480px] overflow-auto rounded-lg border border-gray-200 bg-white">
          <svg
            role="group"
            aria-label="BOM 원가 트리"
            aria-describedby={summaryId}
            width={layout.width}
            height={layout.height}
          >
            {layout.links.map((l) => (
              <path
                key={l.id}
                d={`M${l.x1},${l.y1} H${(l.x1 + l.x2) / 2} V${l.y2} H${l.x2}`}
                fill="none"
                stroke="var(--color-gray-300)"
              />
            ))}
            {layout.nodes.map((n) => {
              const c = cost.byId.get(n.id);
              const focused = focusedId === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  role={n.hasChildren ? 'button' : undefined}
                  tabIndex={n.hasChildren ? 0 : undefined}
                  aria-expanded={n.hasChildren ? !n.collapsed : undefined}
                  aria-label={n.hasChildren ? labelOf(n) : undefined}
                  onClick={n.hasChildren ? () => toggle(n.id) : undefined}
                  onKeyDown={n.hasChildren ? (e) => onKey(e, n.id) : undefined}
                  onFocus={() => setFocusedId(n.id)}
                  onBlur={() => setFocusedId(null)}
                  className={n.hasChildren ? 'cursor-pointer outline-none' : undefined}
                >
                  <title>{labelOf(n)}</title>
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    fill={shareFill(c?.share ?? null)}
                    stroke={
                      focused
                        ? 'var(--color-blue-600)'
                        : c?.missing
                          ? 'var(--color-red-400)'
                          : 'var(--color-gray-300)'
                    }
                    strokeWidth={focused ? 2 : 1}
                    strokeDasharray={c?.missing ? '4 3' : undefined}
                  />
                  <text x={10} y={19} fontSize={12} fontWeight={600} fill="var(--color-gray-900)">
                    {shortName(n.data.name)}
                  </text>
                  {n.hasChildren && (
                    <text
                      x={NODE_W - 10}
                      y={19}
                      fontSize={12}
                      textAnchor="end"
                      fill="var(--color-gray-500)"
                      aria-hidden="true"
                    >
                      {n.collapsed ? '+' : '−'}
                    </text>
                  )}
                  <text x={10} y={36} fontSize={11} fill="var(--color-gray-600)">
                    {qtyText(n.data, n.depth)}
                  </text>
                  <text
                    x={10}
                    y={53}
                    fontSize={11}
                    fill={c?.missing ? 'var(--color-red-600)' : 'var(--color-gray-900)'}
                  >
                    {costText(c)}
                  </text>
                  {n.collapsed && (
                    <text
                      x={NODE_W + COLLAPSED_LABEL_GAP}
                      y={NODE_H / 2}
                      fontSize={11}
                      dominantBaseline="middle"
                      fill="var(--color-gray-500)"
                    >
                      하위 {n.hiddenCount}개 접힘
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <p id={summaryId} className="text-sm text-gray-700">
        완제품 1개 자재 원가{' '}
        <strong className="text-gray-900">
          {cost.total === null
            ? '알 수 없음'
            : `${formatCurrency(cost.total)}${cost.partial ? ' 이상' : ''}`}
        </strong>
        .
        {cost.materials.length > 0 &&
          ` 비중 큰 자재: ${cost.materials
            .slice(0, 3)
            .map(
              (m) =>
                `${m.name} ${formatCurrency(m.contribution)}(${cost.byId.get(m.id)?.share ?? 0}%)`,
            )
            .join(', ')}.`}
        {cost.missingCount > 0 && (
          <span className="text-red-600">
            {' '}
            단가 없는 자재 {cost.missingCount}개는 0 원으로 세지 않았습니다.
          </span>
        )}
      </p>
    </div>
  );
}

function CostTable({ root, cost }: { root: TreeNode; cost: Map<string, NodeCost> }) {
  const rows: { n: TreeNode; depth: number }[] = [];
  const walk = (n: TreeNode, depth: number) => {
    rows.push({ n, depth });
    for (const c of n.children ?? []) walk(c, depth + 1);
  };
  walk(root, 0);
  return (
    <table aria-label="BOM 원가 표" className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="py-1 font-medium">수준</th>
          <th className="py-1 font-medium">품목</th>
          <th className="py-1 text-right font-medium">수량</th>
          <th className="py-1 text-right font-medium">1단위 원가</th>
          <th className="py-1 text-right font-medium">완제품 1개당</th>
          <th className="py-1 text-right font-medium">비중</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ n, depth }) => {
          const c = cost.get(n.id);
          return (
            <tr key={n.id} className="border-t border-gray-100">
              <td className="py-1">{depth}</td>
              <td className="py-1" style={{ paddingLeft: depth * 16 }}>
                {n.name}
              </td>
              <td className="py-1 text-right">{qtyText(n, depth)}</td>
              <td className="py-1 text-right">
                {c?.missing
                  ? '단가 없음'
                  : c?.unitCost === null || c === undefined
                    ? '-'
                    : `${formatCurrency(c.unitCost)}${c.partial ? ' 이상' : ''}`}
              </td>
              <td className="py-1 text-right">
                {/* 트리와 같이 "이상"을 붙인다. 아는 단가만의 합을 정확한 값처럼 보이지 않게(리뷰 P2) */}
                {c?.contribution === null || c === undefined
                  ? '-'
                  : `${formatCurrency(c.contribution)}${c.partial ? ' 이상' : ''}`}
              </td>
              <td className="py-1 text-right">
                {c?.share === null || c === undefined ? '-' : `${c.share}%`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
