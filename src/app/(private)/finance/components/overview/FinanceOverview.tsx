'use client';

import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
    // 탭 틀이 overflow-hidden 이라 여기서 세로 스크롤을 연다. 표로 보기 12행이 짧은 창에서 잘리지 않게(리뷰 P2)
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="grid grid-cols-3 gap-6 py-4">
        <Monthly />
        <Aging />
      </div>
    </div>
  );
}

function Monthly() {
  const summaryId = useId();
  const [showTable, setShowTable] = useState(false);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: financeAnalyticsKeys.monthly(),
    queryFn: getFinanceMonthly,
  });
  const months = data?.months ?? [];

  return (
    <section aria-label="월별 매출과 매입" className="col-span-2 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">월별 매출과 매입(12개월)</h3>
        {months.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <Key />
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-expanded={showTable}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              {showTable ? '차트로 보기' : '표로 보기'}
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="h-64" role="status" aria-label="월별 매출과 매입 불러오는 중" />
      )}
      {isError && (
        <TableStatusBox
          type="error"
          message="월별 매출과 매입을 불러오지 못했습니다."
          error={error}
        />
      )}
      {data && months.length === 0 && (
        <TableStatusBox type="empty" message="표시할 월별 데이터가 없습니다." />
      )}

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
  return (
    <span aria-hidden="true" className="flex items-center gap-3">
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-blue-500" />
        매출
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-gray-300" />
        매입
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-0.5 w-3 bg-gray-900" />
        순이익
      </span>
    </span>
  );
}

function MonthlyTable({ months }: { months: MonthlyPoint[] }) {
  return (
    <table aria-label="월별 매출과 매입 표" className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="py-1 font-medium">월</th>
          <th className="py-1 text-right font-medium">매출</th>
          <th className="py-1 text-right font-medium">매입</th>
          <th className="py-1 text-right font-medium">순이익</th>
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
  const s = monthlySummary(months);
  if (!s) return null;
  return (
    <p id={id} className="text-sm text-gray-700">
      {months.length}개월 매출 {formatCurrency(s.sales)}, 매입 {formatCurrency(s.purchases)}, 순이익{' '}
      {formatCurrency(s.netProfit)}. 순이익이 가장 큰 달은 {s.best.month}(
      {formatCurrency(s.best.netProfit)}), 가장 작은 달은 {s.worst.month}(
      {formatCurrency(s.worst.netProfit)}).{' '}
      {s.lossMonths > 0 ? (
        <strong className="text-red-600">적자 {s.lossMonths}개월.</strong>
      ) : (
        '적자 달 없음.'
      )}
    </p>
  );
}

function Aging() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: financeAnalyticsKeys.aging(),
    queryFn: getArAging,
  });

  return (
    <section aria-label="미수금 경과" className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">미수금 경과</h3>
      {isLoading && <div className="h-64" role="status" aria-label="미수금 경과 불러오는 중" />}
      {isError && (
        <TableStatusBox type="error" message="미수금 경과를 불러오지 못했습니다." error={error} />
      )}
      {data && <AgingTable asOf={data.asOf} buckets={data.buckets} />}
    </section>
  );
}

/**
 * 표가 곧 차트다(시각화 4 결정 3). 구간마다 금액, 건수, 전체 대비 비율 막대.
 * 막대 색은 하나. 위험도는 구간 이름이 이미 말한다(허용 차트 3번).
 */
function AgingTable({ asOf, buckets }: { asOf: string; buckets: AgingBucket[] }) {
  const s = agingSummary(buckets);
  return (
    <>
      <p className="text-sm text-gray-700">
        {asOf} 기준 미수금 {formatCurrency(s.total)} 중 기한 지난 금액{' '}
        <strong className="text-gray-900">
          {formatCurrency(s.overdue)}({s.overdueRate}%)
        </strong>
        .
      </p>
      <table aria-label="미수금 경과 표" className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1 font-medium">경과</th>
            <th className="py-1 text-right font-medium">금액</th>
            <th className="py-1 text-right font-medium">건수</th>
            <th className="py-1 pl-3 font-medium">비율</th>
          </tr>
        </thead>
        <tbody>
          {s.rows.map((r) => (
            <tr key={r.bucket} className="border-t border-gray-100">
              <td className="py-1.5">{r.label}</td>
              <td className="py-1.5 text-right">{formatCurrency(r.amount)}</td>
              <td className="py-1.5 text-right">{r.count}건</td>
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
