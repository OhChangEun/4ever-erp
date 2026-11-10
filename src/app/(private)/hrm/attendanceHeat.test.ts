import { describe, expect, it } from 'vitest';
import { heatGrid, heatLevel, heatSummary } from './attendanceHeat';

const day = (date: string, late: number, absent: number) => ({
  date,
  headcount: 40,
  present: 40 - late - absent,
  late,
  absent,
  onLeave: 0,
});

describe('heatLevel', () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [12, 3],
  ])('%d건 → %d단계', (n, level) => expect(heatLevel(n)).toBe(level));
});

describe('heatGrid', () => {
  // 2026-11-11 은 수요일, 2026-08-26 도 수요일(응답 기간)
  const from = new Date(2026, 7, 26);
  const to = new Date(2026, 10, 11);

  it('응답 기간을 덮는 주들. 첫 칸은 from 이 든 주의 월요일, to 뒤 칸은 없다', () => {
    const grid = heatGrid([], from, to);
    expect(grid.weeks).toBe(12);
    expect(grid.cells[0]).toMatchObject({ date: '2026-08-24', col: 0, row: 0, day: null });
    const last = grid.cells[grid.cells.length - 1];
    expect(last).toMatchObject({ date: '2026-11-11', col: 11, row: 2 });
    expect(grid.cells).toHaveLength(11 * 7 + 3);
  });

  it('기록 있는 날은 이상 건수와 단계를 붙이고, 없는 날은 day 가 null', () => {
    const grid = heatGrid([day('2026-11-10', 2, 1), day('2026-11-09', 0, 0)], from, to);
    const byDate = Object.fromEntries(grid.cells.map((c) => [c.date, c]));
    expect(byDate['2026-11-10']).toMatchObject({ issues: 3, level: 2 });
    expect(byDate['2026-11-09']).toMatchObject({ issues: 0, level: 0 });
    expect(byDate['2026-11-08'].day).toBeNull();
  });

  it('응답의 날은 하나도 빠지지 않는다(월~목에 from 이 주 중간이어도)', () => {
    const days = [day('2026-08-26', 1, 0), day('2026-11-11', 0, 1)];
    const grid = heatGrid(days, from, to);
    const drawn = grid.cells.filter((c) => c.day).map((c) => c.date);
    expect(drawn).toEqual(['2026-08-26', '2026-11-11']);
  });

  it('달이 바뀌는 첫 열에 달 이름', () => {
    const grid = heatGrid([], from, to);
    expect(grid.months.map((m) => m.label)).toEqual(['8월', '9월', '10월', '11월']);
    expect(grid.months[0].col).toBe(0);
  });
});

describe('heatSummary', () => {
  it('근무일 수, 하루 평균(소수 한 자리), 가장 많은 날 3개(같으면 최근 날 먼저)', () => {
    const s = heatSummary([
      day('2026-11-02', 1, 0),
      day('2026-11-03', 4, 1),
      day('2026-11-04', 0, 0),
      day('2026-11-05', 2, 0),
      day('2026-11-06', 2, 0),
    ]);
    expect(s).toEqual({
      days: 5,
      average: 2,
      worst: [
        { date: '2026-11-03', issues: 5 },
        { date: '2026-11-06', issues: 2 },
        { date: '2026-11-05', issues: 2 },
      ],
    });
  });

  it('기록이 없으면 null', () => {
    expect(heatSummary([])).toBeNull();
  });
});
