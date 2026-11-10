import { FINANCE_TABS, type FinanceTab } from '@/app/(private)/finance/finance.tabs';

// 전표 유형의 메시지 키(finance.invoiceType.<키>). 모르는 값은 매출로 본다(예전과 같다)
export const getInvoiceTypeKey = (type: string): 'AR' | 'AP' => (type === 'AP' ? 'AP' : 'AR');

export const getFinanceTabsByRole = (role: string): FinanceTab[] => {
  return FINANCE_TABS.filter((tab) => !tab.roles || tab.roles.includes(role));
};
