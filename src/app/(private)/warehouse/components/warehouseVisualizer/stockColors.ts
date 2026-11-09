/**
 * 3D 창고 재고 블록 색. 장면(WarehouseScene)과 범례(WarehouseVisualizer)가 같이 쓴다.
 * three.js 재질이 직접 받는 값이라 CSS 토큰 대신 상수로 둔다(커스텀 ESLint 규칙 카드).
 */
export const STOCK_COLORS = {
  normal: { base: '#2563eb', hover: '#60a5fa' },
  warning: { base: '#f59e0b', hover: '#fbbf24' },
  low: { base: '#ef4444', hover: '#f87171' },
} as const;
