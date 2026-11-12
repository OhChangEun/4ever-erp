'use client';

import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { formatCurrency } from '@/app/utils/number';
import { getArAging, getFinanceMonthly } from '../../finance.api';
import { financeAnalyticsKeys } from '../../finance.keys';
import { agingSummary, monthlySummary } from '../../financeAnalytics';
import type { AgingBucket, MonthlyPoint } from '../../types/FinanceAnalyticsType';

// Recharts 는 이 탭을 열 때만 받는다(첫 로드 예산, DESIGN_GUIDELINES 허용 차트 1번)
const MonthlyChart = dynamic(() => import('./MonthlyChart'), {
  ssr: false,
  loading: () => <div className="h-64" aria-hidden="true" />,
});

/** 재무 현황 탭(시각화 4). 왼쪽 월별 매출, 매입, 순이익, 오른쪽 미수금 경과 */
export default function FinanceOverview() {
  return (
    // 세로 스크롤은 탭 내용 칸(TabNavigation)이 한다. 표로 보기 12행이 짧은 창에서 넘치면 그 칸이 스크롤된다
    <div className="grid grid-cols-3 gap-6 py-4">
      <Monthly />
      <Aging />
    </div>
  );
}

function Monthly() {
  const t = useTranslations('finance.overview.monthly');
  const summaryId = useId();
  const [showTable, setShowTable] = useState(false);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: financeAnalyticsKeys.monthly(),
    queryFn: getFinanceMonthly,
  });
  const months = data?.months ?? [];

  return (
    <section aria-label={t('region')} className="col-span-2 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        {months.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <Key />
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-expanded={showTable}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              {showTable ? t('showChart') : t('showTable')}
            </button>
          </div>
        )}
      </div>

      {isLoading && <div className="h-64" role="status" aria-label={t('loading')} />}
      {isError && <TableStatusBox type="error" message={t('loadError')} error={error} />}
      {data && months.length === 0 && <TableStatusBox type="empty" message={t('empty')} />}

      {months.length > 0 && (
        <>
          {showTable ? (
            <MonthlyTable months={months} />
          ) : (
            <MonthlyChart months={months} describedBy={summaryId} />
          )}
          <MonthlySummaryText id={summaryId} months={months} />
        </>
      )}
    </section>
  );
}

/** 범례 대신 제목 줄의 글자 표시. 색은 MonthlyChart 와 같다 */
function Key() {
  const t = useTranslations('finance.overview.series');
  return (
    <span aria-hidden="true" className="flex items-center gap-3">
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-blue-500" />
        {t('sales')}
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-gray-300" />
        {t('purchases')}
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-0.5 w-3 bg-gray-900" />
        {t('netProfit')}
      </span>
    </span>
  );
}

function MonthlyTable({ months }: { months: MonthlyPoint[] }) {
  const t = useTranslations('finance.overview');
  return (
    <table aria-label={t('monthly.table')} className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="py-1 font-medium">{t('monthly.month')}</th>
          <th className="py-1 text-right font-medium">{t('series.sales')}</th>
          <th className="py-1 text-right font-medium">{t('series.purchases')}</th>
          <th className="py-1 text-right font-medium">{t('series.netProfit')}</th>
        </tr>
      </thead>
      <tbody>
        {months.map((m) => (
          <tr key={m.month} className="border-t border-gray-100">
            <td className="py-1">{m.month}</td>
            <td className="py-1 text-right">{formatCurrency(m.sales)}</td>
            <td className="py-1 text-right">{formatCurrency(m.purchases)}</td>
            <td className={`py-1 text-right ${m.netProfit < 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(m.netProfit)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MonthlySummaryText({ id, months }: { id: string; months: MonthlyPoint[] }) {
  const t = useTranslations('finance.overview.monthly');
  const s = monthlySummary(months);
  if (!s) return null;
  return (
    <p id={id} className="text-sm text-gray-700">
      {t('summary', {
        months: months.length,
        sales: formatCurrency(s.sales),
        purchases: formatCurrency(s.purchases),
        netProfit: formatCurrency(s.netProfit),
        bestMonth: s.best.month,
        bestProfit: formatCurrency(s.best.netProfit),
        worstMonth: s.worst.month,
        worstProfit: formatCurrency(s.worst.netProfit),
      })}{' '}
      {s.lossMonths > 0 ? (
        <strong className="text-red-600">{t('lossMonths', { count: s.lossMonths })}</strong>
      ) : (
        t('noLoss')
      )}
    </p>
  );
}

function Aging() {
  const t = useTranslations('finance.overview.aging');
  const { data, isLoading, isError, error } = useQuery({
    queryKey: financeAnalyticsKeys.aging(),
    queryFn: getArAging,
  });

  return (
    <section aria-label={t('title')} className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
      {isLoading && <div className="h-64" role="status" aria-label={t('loading')} />}
      {isError && <TableStatusBox type="error" message={t('loadError')} error={error} />}
      {data && <AgingTable asOf={data.asOf} buckets={data.buckets} />}
    </section>
  );
}

/**
 * 표가 곧 차트다(시각화 4 결정 3). 구간마다 금액, 건수, 전체 대비 비율 막대.
 * 막대 색은 하나. 위험도는 구간 이름이 이미 말한다(허용 차트 3번).
 */
function AgingTable({ asOf, buckets }: { asOf: string; buckets: AgingBucket[] }) {
  const t = useTranslations('finance.overview.aging');
  const s = agingSummary(buckets);
  return (
    <>
      <p className="text-sm text-gray-700">
        {t.rich('summary', {
          asOf,
          total: formatCurrency(s.total),
          overdue: formatCurrency(s.overdue),
          rate: s.overdueRate,
          strong: (chunks) => <strong className="text-gray-900">{chunks}</strong>,
        })}
      </p>
      <table aria-label={t('table')} className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1 font-medium">{t('columns.bucket')}</th>
            <th className="py-1 text-right font-medium">{t('columns.amount')}</th>
            <th className="py-1 text-right font-medium">{t('columns.count')}</th>
            <th className="py-1 pl-3 font-medium">{t('columns.share')}</th>
          </tr>
        </thead>
        <tbody>
          {s.rows.map((r) => (
            <tr key={r.bucket} className="border-t border-gray-100">
              <td className="py-1.5">{t(`buckets.${r.bucket}`)}</td>
              <td className="py-1.5 text-right">{formatCurrency(r.amount)}</td>
              <td className="py-1.5 text-right">{t('count', { count: r.count })}</td>
              <td className="py-1.5 pl-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 rounded-sm bg-gray-100" aria-hidden="true">
                    <div className="h-2 rounded-sm bg-blue-500" style={{ width: `${r.share}%` }} />
                  </div>
                  <span className="text-gray-600">{r.share}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
