import type { Schema } from '@/lib/api/contract';
export type InventoryResponse = Schema<'InventoryResponse'>;

export interface InventoryQueryParams {
  statusCode?: string;
  type?: string;
  keyword?: string;
  page?: number;
  size?: number;
}
