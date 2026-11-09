import { describe, expect, it } from 'vitest';
import { formatCurrency, formatNumber } from './number';

describe('formatCurrency', () => {
  it('원 단위 정수를 ₩와 천 단위 구분으로 표시한다', () => {
    expect(formatCurrency(4200000)).toBe('₩4,200,000');
  });

  it('문자열 숫자도 같은 결과를 낸다', () => {
    expect(formatCurrency('4200000')).toBe('₩4,200,000');
  });

  it('값이 없으면 대시를 낸다', () => {
    expect(formatCurrency(null)).toBe('-');
    expect(formatCurrency(undefined)).toBe('-');
    expect(formatCurrency('')).toBe('-');
  });

  it('숫자가 아니면 대시를 낸다', () => {
    expect(formatCurrency('abc')).toBe('-');
  });

  it('0은 대시가 아니라 ₩0 이다', () => {
    expect(formatCurrency(0)).toBe('₩0');
  });
});

describe('formatNumber', () => {
  it('천 단위 구분만 붙인다', () => {
    expect(formatNumber(1200)).toBe('1,200');
  });

  it('값이 없으면 대시를 낸다', () => {
    expect(formatNumber(null)).toBe('-');
  });
});
