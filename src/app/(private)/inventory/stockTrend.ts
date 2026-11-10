/** 재고 추이 계산(시각화 2) */

export interface StockPoint {
  date: string;
  stock: number;
}

const WINDOW = 14;

/**
 * 지금 속도면 며칠 뒤 안전재고 아래로 가는지. 최근 14일(점이 적으면 있는 만큼)의 평균 일 변화로 계산한다.
 * 줄지 않으면 null(말하지 않는다), 이미 아래면 0. 계절성, 발주 예정은 넣지 않은 단순 직선이다.
 */
export const daysUntilBelow = (points: readonly StockPoint[], threshold: number): number | null => {
  if (points.length < 2) return null;
  const current = points[points.length - 1].stock;
  if (current < threshold) return 0;
  const recent = points.slice(-Math.min(WINDOW + 1, points.length));
  const perDay = (recent[recent.length - 1].stock - recent[0].stock) / (recent.length - 1);
  if (perDay >= 0) return null;
  // 딱 같으면 0 이 나오는데 0 은 '이미 아래'라는 뜻이라, 줄고 있으면 적어도 하루(리뷰 P2)
  return Math.max(1, Math.ceil((current - threshold) / -perDay));
};
