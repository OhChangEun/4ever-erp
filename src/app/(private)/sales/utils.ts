import { type InventoryCheckRes } from '@/app/(private)/sales/types/QuoteReviewModalType';
import { SALES_TABS, type SalesTab } from '@/app/(private)/sales/sales.tabs';

// 재고가 모두 충족되는지 여부 확인
export const isAllInventoryFulfilled = (arr: InventoryCheckRes[]): boolean => {
  if (arr.length === 0) return true;
  return !arr.some((item) => item.productionRequired === true);
};

export const getSalesTabsByRole = (role: string): SalesTab[] => {
  return SALES_TABS.filter((tab) => !tab.roles || tab.roles.includes(role));
};
