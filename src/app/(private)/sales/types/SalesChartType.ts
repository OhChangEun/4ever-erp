import type { Schema } from '@/lib/api/contract';

export type SalesAnalysis = Schema<'SalesAnalysis'>;

export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
}
