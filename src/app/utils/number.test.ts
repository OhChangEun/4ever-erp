import { afterEach, describe, expect, it, vi } from 'vitest';
import { compactWon, formatCurrency, formatNumber } from './number';
import { mockBrowserLocale } from '@/test/browserLocale';

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

describe('compactWon', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1_000, '1천'],
    [9_999, '10천'], // 현재 동작 고정(반올림하면 10천)
    [10_000, '1만'],
    [35_000_000, '3,500만'],
    [99_999_999, '10,000만'], // 현재 동작 고정
    [100_000_000, '1억'],
    [120_000_000, '1.2억'],
    [-999, '-999'],
    [-25_000_000, '-2,500만'],
    [-120_000_000, '-1.2억'],
  ])('한국어 %d → %s (예전과 같다)', (n, s) => {
    expect(compactWon(n, 'ko')).toBe(s);
  });

  it.each([
    [0, '0'],
    [999, '999'],
    [1_000, '1K'],
    [9_000, '9K'],
    [1_250_000, '1.3M'],
    [999_999, '1M'],
    [35_000_000, '35M'],
    [120_000_000, '120M'],
    [1_000_000_000, '1B'],
    [-999, '-999'],
    [-25_000_000, '-25M'],
  ])('영어 %d → %s (억, 만, 천을 쓰지 않는다)', (n, s) => {
    expect(compactWon(n, 'en')).toBe(s);
  });
});

describe('브라우저 언어가 de-DE 여도', () => {
  afterEach(() => vi.restoreAllMocks());

  it('formatNumber, formatCurrency, compactWon 의 자리 구분은 쉼표', () => {
    mockBrowserLocale('de-DE');
    expect(formatNumber(1200)).toBe('1,200');
    expect(formatCurrency(4200000)).toBe('₩4,200,000');
    expect(compactWon(35_000_000, 'ko')).toBe('3,500만');
    expect(compactWon(1_250_000, 'en')).toBe('1.3M');
  });
});
