'use client';

import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('dashboard.supplyFlow');
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
    <section aria-label={t('title')} className="card-base p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('title')}
          {data && <span className="ml-2 text-sm font-normal text-gray-500">{data.period}</span>}
        </h2>
        {hasFlow && !tableOnly && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            className="text-sm text-blue-600 hover:underline cursor-pointer"
          >
            {showTable ? t('showChart') : t('showTable')}
          </button>
        )}
      </div>

      {isLoading && <div className="h-72" role="status" aria-label={t('loading')} />}
      {isError && <TableStatusBox type="error" message={t('loadError')} error={error} />}
      {sankey && !hasFlow && <TableStatusBox type="empty" message={t('empty')} />}

      {data && sankey && hasFlow && (
        <>
          {tableOnly && <p className="text-sm text-red-600">{t('cyclic')}</p>}
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
        <p className="text-sm text-red-600">{t('unknownLinks', { count: sankey.unknown })}</p>
      )}
    </section>
  );
}

function Summary({ id, nodes, links }: { id: string; nodes: FlowNode[]; links: FlowLink[] }) {
  const t = useTranslations('dashboard.supplyFlow');
  const s = flowSummary(nodes, links);
  const dropNames = nodes.filter((n) => n.kind === 'drop').map((n) => n.name);
  return (
    <p id={id} className="text-sm text-gray-700">
      {t.rich('summary', {
        stages: s.stages.map((st) => `${st.name} ${formatCurrency(st.value)}`).join(', '),
        dropNames: dropNames.length > 0 ? t('dropNames', { names: dropNames.join(', ') }) : '',
        dropped: formatCurrency(s.dropped),
        rate: s.dropRate === null ? t('rateUnknown') : t('rate', { rate: s.dropRate }),
        strong: (chunks) => <strong className="text-gray-900">{chunks}</strong>,
      })}
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
  const t = useTranslations('dashboard.supplyFlow');
  return (
    <table aria-label={t('table')} className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="py-1 font-medium">{t('columns.from')}</th>
          <th className="py-1 font-medium">{t('columns.to')}</th>
          <th className="py-1 text-right font-medium">{t('columns.amount')}</th>
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
