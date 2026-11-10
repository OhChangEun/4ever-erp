import { scaleTime, timeDay } from 'd3';
import { parseDateKey } from '@/app/utils/date';

/**
 * MES 간트 배치 계산(시각화 3). D3 는 여기서 계산만 한다(시간 축, 눈금).
 * DOM 은 MesGantt(React)가 그린다. D3 가 DOM 을 만지면 React 와 소유권이 겹친다.
 */
export interface GanttRow {
  mesId: string;
  mesNumber: string;
  productName: string;
  startDate: string; // 현지 YYYY-MM-DD
  endDate: string;
  status: string;
  progressRate: number; // 0~100
}

export interface GanttBar {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  progressWidth: number;
  delayed: boolean;
  status: string;
}

export interface GanttLayout {
  bars: GanttBar[];
  todayX: number;
  ticks: { x: number; label: string }[];
  height: number;
}

const DONE = new Set(['COMPLETED', 'DONE', 'FINISHED']);

const dayOf = (key: string) => parseDateKey(key) ?? new Date(NaN);
const label = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const ganttLayout = (
  rows: readonly GanttRow[],
  { today, width, rowHeight }: { today: Date; width: number; rowHeight: number },
): GanttLayout => {
  const starts = rows.map((r) => dayOf(r.startDate));
  // 끝날 하루를 다 칠하려고 다음 날 0시까지
  const ends = rows.map((r) => timeDay.offset(dayOf(r.endDate), 1));
  const min = timeDay.offset(new Date(Math.min(today.getTime(), ...starts.map(Number))), -1);
  const max = timeDay.offset(new Date(Math.max(today.getTime(), ...ends.map(Number))), 1);
  const x = scaleTime().domain([min, max]).range([0, width]);

  const bars = rows.map((r, i) => {
    const left = x(starts[i]);
    const barWidth = Math.max(2, x(ends[i]) - left);
    const progress = Math.min(100, Math.max(0, r.progressRate));
    const delayed = !DONE.has(r.status) && dayOf(r.endDate) < timeDay.floor(today);
    return {
      id: r.mesId,
      label: `${r.mesNumber} ${r.productName}, ${r.startDate}~${r.endDate}, 진행 ${progress}%${
        delayed ? ', 지연' : ''
      }`,
      x: left,
      y: i * rowHeight,
      width: barWidth,
      progressWidth: (barWidth * progress) / 100,
      delayed,
      status: r.status,
    };
  });

  // 눈금은 도메인 시작부터 고르게 3일 간격(d3 의 every(3) 은 달마다 1일부터 다시 세서 월말에 붙는다).
  // 오늘 선 글자와 겹치는 눈금, 오른쪽 끝에서 잘리는 눈금은 뺀다
  const todayX = x(timeDay.floor(today));
  const ticks = timeDay
    .range(timeDay.ceil(min), max, 3)
    .map((d) => ({ x: x(d), label: label(d) }))
    .filter((t) => Math.abs(t.x - todayX) > 28 && t.x < width - 16);

  return {
    bars,
    todayX,
    ticks,
    height: rows.length * rowHeight,
  };
};
