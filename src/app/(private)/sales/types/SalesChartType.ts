import type { Schema } from '@/lib/api/contract';
export type Period = Schema<'Period'>;

export type Trend = Schema<'Trend'>;

export type TrendScale = Schema<'TrendScale'>;

export type ProductShare = Schema<'ProductShare'>;

export type TopCustomer = Schema<'TopCustomer'>;

export type SalesAnalysis = Schema<'SalesAnalysis'>;

export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
}
