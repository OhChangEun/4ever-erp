/**
 * 목의 품목표(카드 "목 데이터 현실성"). 같은 품목은 재고 목록, 상세, 창고별 조회, 안전재고, 견적, 주문, 전표, BOM 에서
 * 같은 번호, 단가, 처음 재고를 쓴다. 예전엔 응답마다 따로 적어 모터 A 단가가 12,000, 1,600, 82,000 으로 달랐다.
 * 쓰기 결과(안전재고 수정, 재고 이동)는 재고 목이 이 값 위에 덮는다.
 */
export interface CatalogItem {
  itemId: string;
  itemNumber: string;
  itemName: string;
  category: string;
  unitPrice: number;
  /** 처음 현재고, 안전재고 */
  current: number;
  safety: number;
}

export const MOTOR: CatalogItem = {
  itemId: 'item-1001',
  itemNumber: 'ITM-1001',
  itemName: '모터 A',
  category: 'MOTOR',
  unitPrice: 12000,
  current: 120,
  safety: 50,
};

export const BEARING: CatalogItem = {
  itemId: 'item-1002',
  itemNumber: 'ITM-1002',
  itemName: '베어링 B',
  category: 'BEARING',
  unitPrice: 8000,
  current: 20,
  safety: 50,
};

/**
 * 창고 3D(시각화 8)의 창고 하나에 놓인 품목 14개. 모터 A, 베어링 B 는 위 값을 쓰고, 나머지는 순번으로 정한다.
 * 안전재고 대비 30%~420%, 마지막 하나는 안전재고 0(재고율 4단계와 기준 없음이 다 나온다)
 */
const WAREHOUSE_ITEM_NAMES = [
  '구리선',
  '베어링 B',
  '볼트 M6',
  '알루미늄 판',
  '모터 A',
  '샤프트',
  '커버',
  '패킹',
  '너트 M6',
  '와셔',
  '하우징',
  '기어',
  '스프링',
  '케이블',
];
export const WAREHOUSE_ITEMS: CatalogItem[] = WAREHOUSE_ITEM_NAMES.map((itemName, i) => {
  if (itemName === MOTOR.itemName) return MOTOR;
  if (itemName === BEARING.itemName) return BEARING;
  const safety = i === 13 ? 0 : 50 + (i % 4) * 25;
  const ratio = [0.3, 0.8, 1.1, 1.3, 1.8, 2.4, 3.5, 4.2][i % 8];
  return {
    itemId: `item-wh-${String(i + 1).padStart(3, '0')}`,
    itemNumber: `ITM-${3000 + i}`,
    itemName,
    category: '자재',
    unitPrice: 1000 + i * 150,
    current: Math.round((safety || 40) * ratio),
    safety,
  };
});

/** 재고 상세가 찾는 품목. 모르는 id 는 undefined */
export const catalogItem = (itemId: string) =>
  WAREHOUSE_ITEMS.find((item) => item.itemId === itemId);

/** 품목 줄. 금액은 수량 × 단가 */
export const line = (item: CatalogItem, quantity: number) => ({
  itemId: item.itemId,
  itemName: item.itemName,
  quantity,
  unitPrice: item.unitPrice,
  amount: quantity * item.unitPrice,
});
