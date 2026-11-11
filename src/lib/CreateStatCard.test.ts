import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStatCard } from './CreateStatCard';
import { mockBrowserLocale } from '@/test/browserLocale';

describe('createStatCard', () => {
  it('통화 단위는 값 앞에 붙는다', () => {
    const card = createStatCard('총 매출', 4200000, 12.5, '₩');
    expect(card.value).toBe('₩4,200,000');
  });

  it('그 외 단위는 값 뒤에 붙는다', () => {
    expect(createStatCard('직원 수', 120, 0, '명').value).toBe('120명');
  });

  it('양수 변화율은 + 부호와 % 를 붙이고 increase 로 분류한다', () => {
    const card = createStatCard('총 매출', 1, 12.5);
    expect(card.change).toBe('+12.5%');
    expect(card.changeType).toBe('increase');
  });

  it('음수 변화율은 부호를 그대로 두고 decrease 로 분류한다', () => {
    const card = createStatCard('총 매출', 1, -3);
    expect(card.change).toBe('-3%');
    expect(card.changeType).toBe('decrease');
  });

  it('변화율 0 은 increase 로 분류한다 (현재 동작 고정)', () => {
    expect(createStatCard('총 매출', 1, 0).changeType).toBe('increase');
  });

  it('값이 없거나 NaN 이면 단위 없이 - 만', () => {
    expect(createStatCard('총 매출', Number.NaN, 0, '₩').value).toBe('-');
    expect(createStatCard('입고', Number.NaN, 0, '건').value).toBe('-');
    // 0 은 값이다. - 로 바꾸지 않는다
    expect(createStatCard('총 매출', 0, 0, '₩').value).toBe('₩0');
    expect(createStatCard('입고', 0, 0, '건').value).toBe('0건');
  });

  describe('브라우저 언어가 de-DE 여도', () => {
    afterEach(() => vi.restoreAllMocks());

    it('자리 구분은 쉼표(1.200 이 아니다)', () => {
      mockBrowserLocale('de-DE');
      expect(createStatCard('총 매출', 4200000, 0, '₩').value).toBe('₩4,200,000');
      expect(createStatCard('입고', 1200, 0, '건').value).toBe('1,200건');
    });
  });
});
