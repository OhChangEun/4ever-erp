import type { Schema } from '@/lib/api/contract';
export type LowStockListResponse = Schema<'LowStockListResponse'>;

export interface LowStockListQueryParams {
  statusCode?: string;
  page?: number;
  size?: number;
}
