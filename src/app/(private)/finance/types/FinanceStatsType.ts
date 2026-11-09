import { Stat, StatResponse } from '@/app/types/StatType';

interface FinanceStat {
  total_purchases: Stat;
  net_profit: Stat;
  total_sales: Stat;
}

interface CustomerSupplierStat {
  total_amount: Stat;
}

export type FinanceStatResponse = StatResponse<FinanceStat>;
export type CustomerSupplierStatResponse = StatResponse<CustomerSupplierStat>;
