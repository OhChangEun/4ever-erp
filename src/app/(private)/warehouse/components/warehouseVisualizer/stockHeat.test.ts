import { describe, expect, it } from 'vitest';
import ko from '@/i18n/messages/warehouse/ko.json';
import { BANDS, stockBand } from './stockHeat';

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

  // 단계 이름은 상수(BAND_LABEL)에서 메시지로 옮겼다(i18n 3). 같은 글자를 메시지에서 확인한다
  it('단계 이름', () => {
    expect(ko.band.short).toBe('부족');
    expect(ko.band.none).toBe('기준 없음');
    expect(Object.keys(ko.band).sort()).toEqual([...BANDS].sort());
  });
});
