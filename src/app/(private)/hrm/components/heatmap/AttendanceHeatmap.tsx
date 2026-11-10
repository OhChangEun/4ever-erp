'use client';

import { useId } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
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
// 요일 글자는 메시지 키(hrm.heatmap.weekdays). 월, 수, 금 줄에만 붙인다
const DAY_LABELS: ('mon' | 'wed' | 'fri' | null)[] = ['mon', null, 'wed', null, 'fri', null, null];

/** 단계 색. 토큰 4개(시각화 5 결정 2) */
const LEVEL_FILL = [
  'var(--color-gray-100)',
  'var(--color-blue-200)',
  'var(--color-blue-400)',
  'var(--color-blue-600)',
] as const;
/** 단계 범례 글자의 메시지 키(hrm.heatmap.levels) */
const LEVEL_KEYS: ('l0' | 'l1' | 'l2' | 'l3')[] = ['l0', 'l1', 'l2', 'l3'];

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
  const t = useTranslations('hrm');
  const locale = useLocale();
  const format = useFormatter();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: attendanceKeys.summary(),
    queryFn: fetchAttendanceDailySummary,
  });

  // 한국어는 예전처럼 2026-11-10 그대로, 다른 언어는 그 언어의 날짜(Nov 10, 2026). 날짜 키는 달력 날이라 UTC 로 고정해 하루가 밀리지 않게
  const dateText = (key: string) => {
    const date = locale === 'ko' ? null : parseDateKey(key);
    if (!date) return key;
    return format.dateTime(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()), {
      dateStyle: 'medium',
      timeZone: 'UTC',
    });
  };
  const titleOf = (c: HeatCell) =>
    c.day
      ? t('heatmap.cell', {
          date: dateText(c.date),
          late: c.day.late,
          absent: c.day.absent,
          onLeave: c.day.onLeave,
          headcount: c.day.headcount,
        })
      : t('heatmap.cellEmpty', { date: dateText(c.date) });

  if (isLoading)
    return <div className="h-[121px]" role="status" aria-label={t('heatmap.loading')} />;
  if (isError)
    return <TableStatusBox type="error" message={t('heatmap.loadError')} error={error} />;
  if (!data || data.days.length === 0)
    return <p className="text-sm text-gray-500">{t('heatmap.empty')}</p>;

  // 응답 기간(from, to)이 그림과 요약의 공통 기준이다(리뷰 P2). 날짜를 못 읽으면 오늘 기준 84일
  const to = parseDateKey(data.to) ?? new Date();
  const from =
    parseDateKey(data.from) ?? new Date(to.getFullYear(), to.getMonth(), to.getDate() - 83);
  const grid = heatGrid(data.days, from, to);
  const summary = heatSummary(data.days);
  const width = LEFT + grid.weeks * STEP;
  const height = TOP + 7 * STEP;

  return (
    <section aria-label={t('heatmap.region')} className="flex items-start gap-8 shrink-0">
      <svg
        role="img"
        aria-label={t('heatmap.image')}
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
            {t('month', { month: String(m.month) })}
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
              {t(`heatmap.weekdays.${label}`)}
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
            {t('heatmap.summary', { days: summary.days, average: summary.average })}{' '}
            {summary.worst.map((w, i) => (
              <span key={w.date}>
                {i > 0 && ', '}
                <button
                  type="button"
                  onClick={() => onSelect(w.date)}
                  className="text-blue-600 hover:underline cursor-pointer tabular-nums"
                >
                  {dateText(w.date)}
                </button>
                {t('heatmap.worstCount', { count: w.issues })}
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
              {t(`heatmap.levels.${LEVEL_KEYS[level]}`)}
            </span>
          ))}
          <span className="ml-1">{t('heatmap.hint')}</span>
        </div>
      </div>
    </section>
  );
}
