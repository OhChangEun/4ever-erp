import { addDays, startOfDay, toDateKey } from '@/app/utils/date';
import type { AttendanceDay } from './types/HrmAttendanceApiType';

/** 근태 이상 = 지각 + 결근(시각화 5 결정 1) */
export const issuesOf = (d: AttendanceDay) => d.late + d.absent;

/** 고정 경계 4단계(시각화 5 결정 2). 0 / 1~2 / 3~4 / 5 이상 */
export const heatLevel = (issues: number): 0 | 1 | 2 | 3 => {
  if (issues <= 0) return 0;
  if (issues <= 2) return 1;
  if (issues <= 4) return 2;
  return 3;
};

export interface HeatCell {
  date: string;
  /** 주(0 이 가장 오래된 주) */
  col: number;
  /** 요일(0 월요일 ~ 6 일요일) */
  row: number;
  /** 기록 없는 날(주말, 휴일)은 null */
  day: AttendanceDay | null;
  issues: number;
  level: 0 | 1 | 2 | 3;
}

/**
 * 잔디 칸 배치. 열은 주(월요일 시작), 행은 요일. 응답의 from 이 든 주부터 to 까지 그리고 to 뒤 칸은 만들지 않는다.
 * 기간을 화면이 따로 정하면 요약에는 있는 날이 그림에서 빠진다(시각화 5 리뷰 P2). 응답 기간이 기준이다.
 * 달은 그 열의 월요일이 새 달일 때 붙인다.
 */
export const heatGrid = (days: AttendanceDay[], from: Date, to: Date) => {
  const end = startOfDay(to);
  const first = startOfDay(from);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const byDate = new Map(days.map((d) => [d.date, d]));

  const cells: HeatCell[] = [];
  for (let i = 0; ; i++) {
    const date = addDays(start, i);
    if (date > end) break;
    const key = toDateKey(date);
    const day = byDate.get(key) ?? null;
    const issues = day ? issuesOf(day) : 0;
    cells.push({
      date: key,
      col: Math.floor(i / 7),
      row: i % 7,
      day,
      issues,
      level: heatLevel(issues),
    });
  }

  // 달은 숫자(1~12)로 둔다. 글자(11월, Nov)는 화면이 바꾼다(i18n 7)
  const months: { col: number; month: number }[] = [];
  for (const cell of cells) {
    if (cell.row !== 0) continue;
    const month = Number(cell.date.slice(5, 7));
    if (months.at(-1)?.month !== month) months.push({ col: cell.col, month });
  }
  const weeks = cells.length === 0 ? 0 : (cells[cells.length - 1]?.col ?? 0) + 1;
  return { weeks, cells, months };
};

/** 근무일 수, 하루 평균 근태 이상(소수 한 자리), 가장 많은 날 3개(같으면 최근 날 먼저) */
export const heatSummary = (days: AttendanceDay[]) => {
  if (days.length === 0) return null;
  const total = days.reduce((sum, d) => sum + issuesOf(d), 0);
  const worst = days
    .map((d) => ({ date: d.date, issues: issuesOf(d) }))
    .sort((a, b) => b.issues - a.issues || b.date.localeCompare(a.date))
    .slice(0, 3);
  return { days: days.length, average: Math.round((total / days.length) * 10) / 10, worst };
};
