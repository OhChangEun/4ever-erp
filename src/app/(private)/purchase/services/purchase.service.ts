// services/purchase.ts
import {
  type PurchaseStatResponse,
  type SupplierPurchaseStatResponse,
} from '@/app/(private)/purchase/types/PurchaseStatsType';
import { createStatCard } from '@/lib/CreateStatCard';
import { type StatCardType } from '@/app/types/StatType';

// 변환 함수
export const mapPurchaseStatsToCards = (
  data: PurchaseStatResponse,
): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '구매 요청',
        stats.purchaseRequestCount.value,
        stats.purchaseRequestCount.delta_rate,
        '건',
        stats.purchaseRequestCount.trend,
      ),
      createStatCard(
        '발주 금액',
        stats.purchaseOrderAmount.value,
        stats.purchaseOrderAmount.delta_rate,
        '₩',
        stats.purchaseOrderAmount.trend,
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};

// 변환 함수
export const mapSupplierPurchaseStatsToCards = (
  data: SupplierPurchaseStatResponse,
): Record<string, StatCardType[]> => {
  return Object.entries(data).reduce<Record<string, StatCardType[]>>((acc, [period, stats]) => {
    const cards: StatCardType[] = [
      createStatCard(
        '발주 건수',
        stats.orderCount.value,
        stats.orderCount.delta_rate,
        '건',
        stats.orderCount.trend,
      ),
    ];

    acc[period] = cards;
    return acc;
  }, {});
};
