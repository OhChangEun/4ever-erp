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
