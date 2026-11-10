import { type InventoryCheckRes } from '@/app/(private)/sales/types/QuoteReviewModalType';
import { SALES_TABS, type SalesTab } from '@/app/(private)/sales/sales.tabs';

// 차트 축과 툴팁의 짧은 금액. 글자(₩, 억, M)는 화면이 sales.chart.money 로 붙인다.
// eok 는 예전 한국어 그대로 소수 한 자리(₩1.2억), million 은 영어용(₩120M)
export const toShortWon = (value: number) => ({
  eok: (value / 100000000).toFixed(1),
  million: (value / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 }),
});

// 재고가 모두 충족되는지 여부 확인
export const isAllInventoryFulfilled = (arr: InventoryCheckRes[]): boolean => {
  if (arr.length === 0) return true;
  return !arr.some((item) => item.productionRequired === true);
};

export const getSalesTabsByRole = (role: string): SalesTab[] => {
  return SALES_TABS.filter((tab) => !tab.roles || tab.roles.includes(role));
};
