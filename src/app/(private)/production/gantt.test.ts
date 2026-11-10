import { describe, expect, it } from 'vitest';
import { ganttLayout } from './gantt';

const TODAY = new Date(2026, 10, 10); // 2026-11-10 현지

const row = (id: string, start: string, end: string, status: string, progress = 0) => ({
  mesId: id,
  mesNumber: id.toUpperCase(),
  productName: '모터 A',
  startDate: start,
  endDate: end,
  status,
  progressRate: progress,
});

describe('ganttLayout(시각화 3)', () => {
  const rows = [
    row('mes-1', '2026-11-01', '2026-11-08', 'IN_PROGRESS', 60), // 끝났어야 하는데 진행 중 → 지연
    row('mes-2', '2026-11-05', '2026-11-15', 'IN_PROGRESS', 30),
    row('mes-3', '2026-11-09', '2026-11-20', 'WAITING'),
    row('mes-4', '2026-10-28', '2026-11-03', 'COMPLETED', 100), // 끝났고 완료 → 지연 아님
  ];
  const layout = ganttLayout(rows, { today: TODAY, width: 600, rowHeight: 28 });

  it('막대마다 시작이 빠를수록 왼쪽, 기간이 길수록 넓다', () => {
    const [a, b, c] = layout.bars;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
    expect(c.width).toBeGreaterThan(a.width);
    layout.bars.forEach((bar, i) => expect(bar.y).toBe(i * 28));
  });

  it('진행률만큼 채운 폭', () => {
    const [a] = layout.bars;
    expect(a.progressWidth).toBeCloseTo(a.width * 0.6, 5);
  });

  it('완료가 아닌데 끝날이 오늘보다 앞이면 지연, 완료면 지연 아님', () => {
    expect(layout.bars.map((b) => b.delayed)).toEqual([true, false, false, false]);
  });

  it('오늘 선이 그래프 안에 있고 눈금이 날짜 순서다', () => {
    expect(layout.todayX).toBeGreaterThan(0);
    expect(layout.todayX).toBeLessThan(600);
    const xs = layout.ticks.map((t) => t.x);
    expect([...xs].sort((p, q) => p - q)).toEqual(xs);
    expect(layout.ticks[0]?.label).toMatch(/^\d{2}-\d{2}$/);
  });

  it('막대 이름에 쓸 진행률과 지연', () => {
    // 이름 글자('MES-1 모터 A, 2026-11-01~2026-11-08, 진행 60%, 지연')는 화면이 메시지(production.gantt)로 만든다.
    // 헬퍼는 진행률과 지연만 준다(i18n 9). 글자는 production.i18n.test 가 본다
    expect(layout.bars[0]).toMatchObject({ id: 'mes-1', progress: 60, delayed: true });
  });
});
