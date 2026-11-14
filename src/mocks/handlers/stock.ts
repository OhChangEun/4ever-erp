import { mockState } from '../state';
import type { CatalogItem } from './catalog';

/**
 * 재고 목이 기억하는 쓰기 결과(로그인별, `src/mocks/state.ts`)와 그 위에 계산한 현재고.
 * 재고, 영업(견적 재고 확인), 생산(MRP, MPS), 재고 추이 목이 같이 읽는다. 핸들러 파일끼리 서로 부르지 않게 따로 둔다
 * (재고 목이 영업 주문을 읽고 영업 목이 재고를 읽는다).
 * 안전재고 수정과 재고 이동은 화면이 응답 전에 값을 바꾼다(낙관적). 목이 안 따르면 다시 가져올 때 원래 값으로 돌아간다
 */
export const inventoryState = mockState<{
  safetyStock: Map<string, number>;
  /** 품목 id → 기본 창고(wh-001)에서 나간 수량. 들어온 것은 음수 */
  movedOut: Map<string, number>;
  /** 그 로그인이 보낸 재고 이동 기록. 최근 것이 앞 */
  transfers: Array<{ itemName: string; quantity: number; workDate: string }>;
}>(() => ({ safetyStock: new Map(), movedOut: new Map(), transfers: [] }));

/** 재고 목의 창고. 품목은 모두 이 창고에 있고 재고 이동은 이 창고에서 나가거나 들어올 때만 현재고가 바뀐다 */
export const DETAIL_WAREHOUSE_ID = 'wh-001';

/** 품목표의 처음 재고에 쓰기 결과를 덮는다. 같은 품목은 어느 조회에서나(재고 추이, 견적 재고 확인, MRP 포함) 같은 수량이다 */
export const stockOf = (request: Request, item: CatalogItem) => {
  const state = inventoryState(request);
  return {
    currentStock: item.current - (state.movedOut.get(item.itemId) ?? 0),
    safetyStock: state.safetyStock.get(item.itemId) ?? item.safety,
  };
};

/**
 * 재고 상태. 안전재고의 절반 미만 URGENT, 안전재고 미만 CAUTION, 그 밖 NORMAL.
 * 게이트웨이 옛 목 규칙(mockdata ImController.java:669-671, :762). 실서버 기준은 모른다(verified=false)
 */
export const stockStatus = ({ currentStock, safetyStock }: ReturnType<typeof stockOf>) =>
  currentStock < safetyStock * 0.5 ? 'URGENT' : currentStock < safetyStock ? 'CAUTION' : 'NORMAL';
