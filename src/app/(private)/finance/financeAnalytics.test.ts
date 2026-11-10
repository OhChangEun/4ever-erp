import { describe, expect, it } from 'vitest';
import { compactWon } from '@/app/utils/number';
import { agingSummary, monthlySummary } from './financeAnalytics';

const months = [
  { month: '2026-01', sales: 100, purchases: 80, netProfit: 20 },
  { month: '2026-02', sales: 90, purchases: 100, netProfit: -10 },
  { month: '2026-03', sales: 150, purchases: 90, netProfit: 60 },
];

describe('monthlySummary', () => {
  it('합계, 가장 큰 달과 작은 달, 적자 달 수', () => {
    expect(monthlySummary(months)).toEqual({
      sales: 340,
      purchases: 270,
      netProfit: 70,
      best: { month: '2026-03', netProfit: 60 },
      worst: { month: '2026-02', netProfit: -10 },
      lossMonths: 1,
    });
  });

  it('빈 배열이면 null', () => {
    expect(monthlySummary([])).toBeNull();
  });
});

describe('agingSummary', () => {
  it('전체, 기한 지난 금액과 비율, 구간 비율', () => {
    const s = agingSummary([
      { bucket: 'CURRENT', amount: 600, count: 3 },
      { bucket: 'D1_30', amount: 200, count: 2 },
      { bucket: 'D31_60', amount: 100, count: 1 },
      { bucket: 'D61_90', amount: 0, count: 0 },
      { bucket: 'D90_PLUS', amount: 100, count: 1 },
    ]);
    expect(s.total).toBe(1000);
    expect(s.overdue).toBe(400);
    expect(s.overdueRate).toBe(40);
    // 구간 이름은 화면이 키로 번역한다(i18n 2). 계산은 키와 순서만 지킨다
    expect(s.rows.map((r) => r.bucket)).toEqual([
      'CURRENT',
      'D1_30',
      'D31_60',
      'D61_90',
      'D90_PLUS',
    ]);
    expect(s.rows.map((r) => r.share)).toEqual([60, 20, 10, 0, 10]);
  });

  it('미수금이 없으면 비율은 0', () => {
    const s = agingSummary([{ bucket: 'CURRENT', amount: 0, count: 0 }]);
    expect(s.overdueRate).toBe(0);
    expect(s.rows[0].share).toBe(0);
  });
});

describe('compactWon', () => {
  it.each([
    [0, '0'],
    [9_000, '9천'],
    [35_000_000, '3,500만'],
    [120_000_000, '1.2억'],
    [1_000_000_000, '10억'],
    [-25_000_000, '-2,500만'],
  ])('%d → %s', (n, s) => {
    expect(compactWon(n)).toBe(s);
  });
});
