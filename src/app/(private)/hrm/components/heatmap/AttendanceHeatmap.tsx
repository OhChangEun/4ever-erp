'use client';

import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { fetchAttendanceDailySummary } from '../../api/hrm.api';
import { attendanceKeys } from '../../api/hrm.keys';
import { parseDateKey } from '@/app/utils/date';
import { heatGrid, heatSummary, type HeatCell } from '../../attendanceHeat';

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 22;
const TOP = 16;
const DAY_LABELS = ['월', '', '수', '', '금', '', ''];

/** 단계 색. 토큰 4개(시각화 5 결정 2) */
const LEVEL_FILL = [
  'var(--color-gray-100)',
  'var(--color-blue-200)',
  'var(--color-blue-400)',
  'var(--color-blue-600)',
] as const;
const LEVEL_TEXT = ['0건', '1~2건', '3~4건', '5건 이상'] as const;

const titleOf = (c: HeatCell) =>
  c.day
    ? `${c.date} 지각 ${c.day.late}, 결근 ${c.day.absent}, 휴가 ${c.day.onLeave} / ${c.day.headcount}명`
    : `${c.date} 기록 없음`;

/**
 * 근태 이상(지각 + 결근) 잔디(시각화 5). 라이브러리 없이 SVG 한 장.
 * 칸을 누르면 그 날짜를 고른다. 키보드는 옆의 날짜 선택기가 같은 일을 한다(허용 차트 규칙 3).
 */
export default function AttendanceHeatmap({
  selectedDate,
  onSelect,
}: {
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const summaryId = useId();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: attendanceKeys.summary(),
    queryFn: fetchAttendanceDailySummary,
  });

  if (isLoading)
    return <div className="h-[121px]" role="status" aria-label="근태 잔디 불러오는 중" />;
  if (isError)
    return <TableStatusBox type="error" message="근태 잔디를 불러오지 못했습니다." error={error} />;
  if (!data || data.days.length === 0)
    return <p className="text-sm text-gray-500">최근 12주 근태 기록이 없습니다.</p>;

  // 응답 기간(from, to)이 그림과 요약의 공통 기준이다(리뷰 P2). 날짜를 못 읽으면 오늘 기준 84일
  const to = parseDateKey(data.to) ?? new Date();
  const from =
    parseDateKey(data.from) ?? new Date(to.getFullYear(), to.getMonth(), to.getDate() - 83);
  const grid = heatGrid(data.days, from, to);
  const summary = heatSummary(data.days);
  const width = LEFT + grid.weeks * STEP;
  const height = TOP + 7 * STEP;

  return (
    <section aria-label="근태 잔디" className="flex items-start gap-8 shrink-0">
      <svg
        role="img"
        aria-label="근태 이상 잔디(12주)"
        aria-describedby={summaryId}
        width={width}
        height={height}
        className="shrink-0"
      >
        {grid.months.map((m) => (
          <text
            key={m.col}
            x={LEFT + m.col * STEP}
            y={10}
            fontSize={10}
            fill="var(--color-gray-500)"
          >
            {m.label}
          </text>
        ))}
        {DAY_LABELS.map((label, row) =>
          label ? (
            <text
              key={row}
              x={0}
              y={TOP + row * STEP + CELL - 2}
              fontSize={10}
              fill="var(--color-gray-500)"
            >
              {label}
            </text>
          ) : null,
        )}
        {grid.cells.map((c) => {
          const selected = c.date === selectedDate;
          return (
            <rect
              key={c.date}
              data-date={c.date}
              data-selected={selected ? 'true' : undefined}
              x={LEFT + c.col * STEP}
              y={TOP + c.row * STEP}
              width={CELL}
              height={CELL}
              rx={2}
              fill={c.day ? LEVEL_FILL[c.level] : 'transparent'}
              stroke={selected ? 'var(--color-gray-900)' : c.day ? 'none' : 'var(--color-gray-200)'}
              strokeWidth={selected ? 1.5 : 1}
              className="cursor-pointer"
              onClick={() => onSelect(c.date)}
            >
              <title>{titleOf(c)}</title>
            </rect>
          );
        })}
      </svg>

      <div className="space-y-2 text-sm">
        {summary && (
          <p id={summaryId} className="text-gray-700">
            최근 12주 근무일 {summary.days}일, 근태 이상(지각 + 결근) 하루 평균 {summary.average}건.
            가장 많은 날은{' '}
            {summary.worst.map((w, i) => (
              <span key={w.date}>
                {i > 0 && ', '}
                <button
                  type="button"
                  onClick={() => onSelect(w.date)}
                  className="text-blue-600 hover:underline cursor-pointer tabular-nums"
                >
                  {w.date}
                </button>
                ({w.issues}건)
              </span>
            ))}
            .
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500" aria-hidden="true">
          {LEVEL_FILL.map((fill, level) => (
            <span key={fill} className="flex items-center gap-1">
              <svg width={CELL} height={CELL}>
                <rect width={CELL} height={CELL} rx={2} fill={fill} />
              </svg>
              {LEVEL_TEXT[level]}
            </span>
          ))}
          <span className="ml-1">칸을 누르면 그날 기록을 아래에 보입니다.</span>
        </div>
      </div>
    </section>
  );
}
