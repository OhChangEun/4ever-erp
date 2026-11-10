import { describe, expect, it } from 'vitest';
import { BAND_LABEL, stockBand } from './stockHeat';

describe('stockBand', () => {
  it.each([
    [40, 50, 'short'],
    [50, 50, 'caution'],
    [74, 50, 'caution'],
    [75, 50, 'ok'],
    [149, 50, 'ok'],
    [150, 50, 'high'],
    [10, 0, 'none'],
  ] as const)('현재 %d, 안전 %d → %s', (current, safety, band) => {
    expect(stockBand(current, safety)).toBe(band);
  });

  it('단계 이름', () => {
    expect(BAND_LABEL.short).toBe('부족');
    expect(BAND_LABEL.none).toBe('기준 없음');
  });
});
