// 금액 → ₩4,200,000 (값이 없으면 '-')
export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return '-';
  return `₩${n.toLocaleString('ko-KR')}`;
};

// 수량 → 1,200 (값이 없으면 '-')
export const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('ko-KR');
};

const trim = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });

const compactEn = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * 차트 축, 라벨용 짧은 금액(시각화 4, 6). 정확한 값은 표와 툴팁이 보인다.
 * 한국어 1.2억, 3,500만, 9천. 영어 120M, 35M, 9K. locale 은 화면 언어(useLocale), en 이 아니면 한국어
 */
export const compactWon = (n: number, locale: string): string => {
  if (locale === 'en') return compactEn.format(n);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 100_000_000) return `${sign}${trim(abs / 100_000_000)}억`;
  if (abs >= 10_000) return `${sign}${trim(abs / 10_000)}만`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}천`;
  return `${sign}${abs}`;
};
