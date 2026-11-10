import { FINANCE_TABS } from '@/app/(private)/finance/finance.tabs';
import { type Tab } from '@/app/types/NavigationType';
// 전표 유형 텍스트
export const getInvoiceType = (type: string) => {
  switch (type) {
    case 'AR':
      return '매출 전표';
    case 'AP':
      return '매입 전표';
    default:
      return '매출 전표';
  }
};

export const getFinanceTabsByRole = (role: string): Tab[] => {
  return FINANCE_TABS.filter((tab) => !tab.roles || tab.roles.includes(role));
};
