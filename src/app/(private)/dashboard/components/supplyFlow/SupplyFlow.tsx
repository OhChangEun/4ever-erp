'use client';

import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { formatCurrency } from '@/app/utils/number';
import { getSupplyFlow } from '../../dashboard.api';
import { dashboardKeys } from '../../dashboard.keys';
import { flowSummary, toSankeyData } from '../../supplyFlow';
import type { FlowLink, FlowNode } from '../../types/SupplyFlowType';

// Recharts Sankey 는 이 카드가 보일 때만 받는다(첫 로드 예산)
const SupplyFlowChart = dynamic(() => import('./SupplyFlowChart'), {
  ssr: false,
  loading: () => <div className="h-72" aria-hidden="true" />,
});

/**
 * 이번 달 자재 흐름(시각화 6). 구매요청에서 출하까지 단계 사이의 금액.
 * 그래프 모양은 서버가 준다. 모르는 노드를 가리키는 흐름은 빼고 알리며, 순환이 있으면 표만 보인다.
 */
export default function SupplyFlow() {
  const summaryId = useId();
  const [showTable, setShowTable] = useState(false);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: dashboardKeys.supplyFlow(),
    queryFn: getSupplyFlow,
    // 다른 도메인 mutation 이 이 키를 지우지 않는다. 대시보드에 올 때마다 새로 받는다(결정 3)
    staleTime: 0,
  });

  const sankey = data ? toSankeyData(data.nodes, data.links) : null;
  const hasFlow = !!sankey && sankey.links.length > 0;
  const tableOnly = !!sankey?.cyclic;

  return (
    <section aria-label="이번 달 자재 흐름(금액)" className="card-base p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          이번 달 자재 흐름(금액)
          {data && <span className="ml-2 text-sm font-normal text-gray-500">{data.period}</span>}
        </h2>
        {hasFlow && !tableOnly && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            className="text-sm text-blue-600 hover:underline cursor-pointer"
          >
            {showTable ? '차트로 보기' : '표로 보기'}
          </button>
        )}
      </div>

      {isLoading && <div className="h-72" role="status" aria-label="자재 흐름 불러오는 중" />}
      {isError && (
        <TableStatusBox type="error" message="자재 흐름을 불러오지 못했습니다." error={error} />
      )}
      {sankey && !hasFlow && (
        <TableStatusBox type="empty" message="이번 달 자재 흐름이 없습니다." />
      )}

      {data && sankey && hasFlow && (
        <>
          {tableOnly && (
            <p className="text-sm text-red-600">
              흐름이 되돌아가는 구간이 있어 차트로 그리지 않았습니다. 표로 보입니다.
            </p>
          )}
          {showTable || tableOnly ? (
            <FlowTable nodes={sankey.nodes} links={sankey.links} />
          ) : (
            <SupplyFlowChart nodes={sankey.nodes} links={sankey.links} describedBy={summaryId} />
          )}
          <Summary id={summaryId} nodes={data.nodes} links={data.links} />
        </>
      )}
      {/* 흐름이 전부 걸러져도 경고는 보인다. 빈 달과 잘못된 응답을 구별한다(리뷰 P2) */}
      {sankey && sankey.unknown > 0 && (
        <p className="text-sm text-red-600">알 수 없는 흐름 {sankey.unknown}건은 뺐습니다.</p>
      )}
    </section>
  );
}

function Summary({ id, nodes, links }: { id: string; nodes: FlowNode[]; links: FlowLink[] }) {
  const s = flowSummary(nodes, links);
  const dropNames = nodes.filter((n) => n.kind === 'drop').map((n) => n.name);
  return (
    <p id={id} className="text-sm text-gray-700">
      단계별 금액: {s.stages.map((st) => `${st.name} ${formatCurrency(st.value)}`).join(', ')}. 새는
      금액{dropNames.length > 0 && `(${dropNames.join(', ')})`}{' '}
      <strong className="text-gray-900">
        {formatCurrency(s.dropped)}
        {s.dropRate === null ? '(시작 금액을 정할 수 없음)' : `(시작 금액의 ${s.dropRate}%)`}
      </strong>
      .
    </p>
  );
}

/** 표도 차트와 같은 걸러진 흐름을 보인다(리뷰 P2). 링크는 노드 인덱스 */
function FlowTable({
  nodes,
  links,
}: {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number }[];
}) {
  return (
    <table aria-label="자재 흐름 표" className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="py-1 font-medium">출발</th>
          <th className="py-1 font-medium">도착</th>
          <th className="py-1 text-right font-medium">금액</th>
        </tr>
      </thead>
      <tbody>
        {links.map((l) => (
          <tr key={`${l.source}-${l.target}`} className="border-t border-gray-100">
            <td className="py-1">{nodes[l.source]?.name}</td>
            <td className="py-1">{nodes[l.target]?.name}</td>
            <td className="py-1 text-right">{formatCurrency(l.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
