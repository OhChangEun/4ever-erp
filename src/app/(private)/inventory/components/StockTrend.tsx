'use client';

import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStockHistory } from '../inventory.api';
import { inventoryKeys } from '../inventory.keys';
import { daysUntilBelow } from '../stockTrend';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { useTranslations } from 'next-intl';
import { formatNumber } from '@/app/utils/number';

// Recharts 는 모달을 열 때만 받는다(첫 로드 예산, DESIGN_GUIDELINES 허용 차트 1번)
const StockTrendChart = dynamic(() => import('./StockTrendChart'), {
  ssr: false,
  loading: () => <div className="h-40" aria-hidden="true" />,
});

/**
 * 품목 재고 추이(최근 30일)와 안전재고선, 소진 예상(시각화 2).
 * 차트 아래 요약 문장이 차트의 설명이고, "표로 보기"가 같은 데이터를 표로 연다.
 */
export default function StockTrend({ itemId }: { itemId: string }) {
  const t = useTranslations('inventory.trend');
  const summaryId = useId();
  const [showTable, setShowTable] = useState(false);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: inventoryKeys.history(itemId),
    queryFn: () => getStockHistory(itemId),
  });

  return (
    <section aria-label={t('title')} className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">{t('title')}</h4>
        {data && (
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

      {isLoading && <div className="h-40" role="status" aria-label={t('loading')} />}
      {isError && <TableStatusBox type="error" message={t('loadError')} error={error} />}

      {data && (
        <>
          {showTable ? (
            <table aria-label={t('tableLabel')} className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 font-medium">{t('date')}</th>
                  <th className="py-1 text-right font-medium">
                    {t('stockColumn', { unit: data.uomName })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.points.map((p) => (
                  <tr key={p.date} className="border-t border-gray-100">
                    <td className="py-1">{p.date}</td>
                    <td className="py-1 text-right">{formatNumber(p.stock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <StockTrendChart
              points={data.points}
              safetyStock={data.safetyStock}
              describedBy={summaryId}
            />
          )}
          <Summary
            id={summaryId}
            points={data.points}
            safetyStock={data.safetyStock}
            unit={data.uomName}
          />
        </>
      )}
    </section>
  );
}

function Summary({
  id,
  points,
  safetyStock,
  unit,
}: {
  id: string;
  points: { date: string; stock: number }[];
  safetyStock: number;
  unit: string;
}) {
  const t = useTranslations('inventory.trend');
  if (points.length === 0)
    return (
      <p id={id} className="text-sm text-gray-500">
        {t('empty')}
      </p>
    );
  const first = points[0].stock;
  const last = points[points.length - 1].stock;
  const min = Math.min(...points.map((p) => p.stock));
  const days = daysUntilBelow(points, safetyStock);
  return (
    <p id={id} className="text-sm text-gray-700">
      {t('summary', {
        first: formatNumber(first),
        last: formatNumber(last),
        unit,
        min: formatNumber(min),
        safety: formatNumber(safetyStock),
      })}{' '}
      {days === 0 && <strong className="text-red-600">{t('alreadyBelow')}</strong>}
      {days !== null && days > 0 && (
        <strong className="text-gray-900">{t('daysUntilBelow', { days })}</strong>
      )}
    </p>
  );
}
