import { createStatCard } from '@/lib/CreateStatCard';
import { StatCardType } from '@/app/types/StatType';
import {
  CustomerSalesStatResponse,
  SalesStatResponse,
} from '@/app/(private)/sales/types/SalesStatsType';

export const mapSalesStatsToCards = (data: SalesStatResponse): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '매출',
        stats.sales_amount.value,
        stats.sales_amount.delta_rate,
        '₩',
        stats.sales_amount.trend,
      ),
      createStatCard(
        '신규 주문',
        stats.new_orders_count.value,
        stats.new_orders_count.delta_rate,
        '건',
        stats.new_orders_count.trend,
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};

export const mapCustomerSalesStatsToCards = (
  data: CustomerSalesStatResponse,
): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '견적 건수',
        stats.quotation_count.value,
        stats.quotation_count.delta_rate,
        '건',
        stats.quotation_count.trend,
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};
