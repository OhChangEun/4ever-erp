import { describe, expect, it } from 'vitest';
import { daysUntilBelow } from './stockTrend';

const series = (values: number[]) =>
  values.map((stock, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, stock }));

describe('daysUntilBelow(안전재고 아래까지 남은 날)', () => {
  it('최근 14일 평균으로 줄고 있으면 남은 날을 올림으로', () => {
    // 하루 5 씩 줄어 지금 120, 안전재고 50 → (120-50)/5 = 14일
    const values = Array.from({ length: 30 }, (_, i) => 265 - i * 5);
    expect(daysUntilBelow(series(values), 50)).toBe(14);
  });

  it('늘거나 그대로면 null(말하지 않는다)', () => {
    expect(daysUntilBelow(series([10, 20, 30, 40]), 5)).toBeNull();
    expect(daysUntilBelow(series([40, 40, 40, 40]), 5)).toBeNull();
  });

  it('이미 안전재고 아래면 0', () => {
    expect(daysUntilBelow(series([60, 50, 40]), 45)).toBe(0);
  });

  it('점이 2개 미만이면 null', () => {
    expect(daysUntilBelow(series([100]), 50)).toBeNull();
  });
});
