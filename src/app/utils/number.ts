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

/** 차트 축, 라벨용 짧은 금액(시각화 4, 6). 1.2억, 3,500만, 9천. 정확한 값은 표와 툴팁이 보인다 */
export const compactWon = (n: number): string => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 100_000_000) return `${sign}${trim(abs / 100_000_000)}억`;
  if (abs >= 10_000) return `${sign}${trim(abs / 10_000)}만`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}천`;
  return `${sign}${abs}`;
};
