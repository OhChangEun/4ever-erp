/**
 * 창고 3D 재고율 색(시각화 8). 재고율 = 현재고 / 안전재고.
 * 빨강은 모자람, 파랑은 넉넉함(결정 1). 안전재고가 0 이면 비율을 정할 수 없어 회색.
 */
export type StockBand = 'short' | 'caution' | 'ok' | 'high' | 'none';

export const stockBand = (current: number, safety: number): StockBand => {
  if (safety <= 0) return 'none';
  const ratio = current / safety;
  if (ratio < 1) return 'short';
  if (ratio < 1.5) return 'caution';
  if (ratio < 3) return 'ok';
  return 'high';
};

/** 범례와 목록 순서. 단계 이름은 메시지(warehouse.band.<단계>)에 있고 그릴 때 바꾼다 */
export const BANDS: readonly StockBand[] = ['short', 'caution', 'ok', 'high', 'none'];

/** 단계마다 토큰. base 는 블록, hover 는 마우스를 올렸을 때 */
export const BAND_TOKEN: Record<StockBand, { base: string; hover: string; className: string }> = {
  short: { base: '--color-red-500', hover: '--color-red-400', className: 'bg-red-500' },
  caution: { base: '--color-red-200', hover: '--color-red-100', className: 'bg-red-200' },
  ok: { base: '--color-blue-300', hover: '--color-blue-200', className: 'bg-blue-300' },
  high: { base: '--color-blue-600', hover: '--color-blue-500', className: 'bg-blue-600' },
  none: { base: '--color-gray-300', hover: '--color-gray-200', className: 'bg-gray-300' },
};

/** 토큰을 못 읽을 때(테스트, 스타일 로드 전) 쓰는 값. packages/ui/tokens.css 와 같다 */
const FALLBACK: Record<string, string> = {
  '--color-red-500': '#c93c3c',
  '--color-red-400': '#e05f5f',
  '--color-red-200': '#f5bcbc',
  '--color-red-100': '#fbe3e3',
  '--color-blue-300': '#aab9d9',
  '--color-blue-200': '#cdd6ea',
  '--color-blue-600': '#263e6a',
  '--color-blue-500': '#2f4a7f',
  '--color-gray-300': '#cfd6de',
  '--color-gray-200': '#e1e5ea',
};

/**
 * three.js 재질은 CSS 변수를 못 받는다. 실행 때 문서의 토큰 값을 꺼낸다.
 * 토큰을 바꾸면 3D 색도 같이 바뀐다(예전엔 hex 상수가 따로 있었다).
 */
export const readBandColors = (): Record<StockBand, { base: string; hover: string }> => {
  const style = typeof document === 'undefined' ? null : getComputedStyle(document.documentElement);
  const read = (name: string) =>
    style?.getPropertyValue(name).trim() || FALLBACK[name] || '#999999';
  const pair = (band: StockBand) => ({
    base: read(BAND_TOKEN[band].base),
    hover: read(BAND_TOKEN[band].hover),
  });
  return {
    short: pair('short'),
    caution: pair('caution'),
    ok: pair('ok'),
    high: pair('high'),
    none: pair('none'),
  };
};
