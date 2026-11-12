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

  // 변화율은 계약대로 비율(0.12 = 12%)이다. 화면은 100 을 곱해 소수 첫째 자리 퍼센트로 보인다(목 데이터 현실성 리뷰 7).
  // 예전 입력 12.5, -3 은 퍼센트 값이었다. 기대 글자는 그대로이고 입력만 비율로 바꿨다
  it('양수 변화율은 + 부호와 % 를 붙이고 increase 로 분류한다', () => {
    const card = createStatCard('총 매출', 1, 0.125);
    expect(card.change).toBe('+12.5%');
    expect(card.changeType).toBe('increase');
  });

  it('음수 변화율은 부호를 그대로 두고 decrease 로 분류한다', () => {
    const card = createStatCard('총 매출', 1, -0.03);
    expect(card.change).toBe('-3%');
    expect(card.changeType).toBe('decrease');
  });

  it('비율에 100 을 곱해 소수 첫째 자리까지 보인다', () => {
    expect(createStatCard('총 매출', 1, 0.083).change).toBe('+8.3%');
    expect(createStatCard('총 매출', 1, -0.12).change).toBe('-12%');
    expect(createStatCard('총 매출', 1, 0.0834).change).toBe('+8.3%');
    expect(createStatCard('총 매출', 1, 0).change).toBe('0%');
  });

  it('반올림해 0% 가 되는 아주 작은 감소는 0% 이고 increase 다(▼0% 를 보이지 않는다)', () => {
    const card = createStatCard('총 매출', 1, -0.0004);
    expect(card.change).toBe('0%');
    expect(card.changeType).toBe('increase');
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
