// services/purchase.ts
import {
  type PurchaseStatResponse,
  type SupplierPurchaseStatResponse,
} from '@/app/(private)/purchase/types/PurchaseStatsType';
import { createStatCard } from '@/lib/CreateStatCard';
import { type Stat, type StatCardType } from '@/app/types/StatType';
import type purchaseKo from '@/i18n/messages/purchase/ko.json';

/**
 * 카드 제목은 메시지 키(purchase.stats.<키>). 건수 카드 값은 단위 없이 둔다(단위 '건'은 purchase.statCount).
 * 응답은 캐시에 남으니 글자는 그릴 때 바꾼다(언어를 바꿔도 다시 받지 않게)
 */
export type PurchaseStatTitle = keyof typeof purchaseKo.stats;
export interface PurchaseStatCard extends StatCardType {
  title: PurchaseStatTitle;
  /** count 면 화면이 단위를 붙인다. won 은 '₩' 가 이미 붙어 있다 */
  unit: 'count' | 'won';
}

const countCard = (title: PurchaseStatTitle, stat: Stat): PurchaseStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '', stat.trend),
  title,
  unit: 'count',
});

const wonCard = (title: PurchaseStatTitle, stat: Stat): PurchaseStatCard => ({
  ...createStatCard(title, stat.value, stat.delta_rate, '₩', stat.trend),
  title,
  unit: 'won',
});

// 변환 함수
export const mapPurchaseStatsToCards = (
  data: PurchaseStatResponse,
): Record<string, PurchaseStatCard[]> => {
  return Object.entries(data).reduce<Record<string, PurchaseStatCard[]>>((acc, [period, stats]) => {
    acc[period] = [
      countCard('purchaseRequests', stats.purchaseRequestCount),
      wonCard('purchaseOrderAmount', stats.purchaseOrderAmount),
    ];
    return acc;
  }, {});
};

// 변환 함수
export const mapSupplierPurchaseStatsToCards = (
  data: SupplierPurchaseStatResponse,
): Record<string, PurchaseStatCard[]> => {
  return Object.entries(data).reduce<Record<string, PurchaseStatCard[]>>((acc, [period, stats]) => {
    acc[period] = [countCard('orderCount', stats.orderCount)];
    return acc;
  }, {});
};
