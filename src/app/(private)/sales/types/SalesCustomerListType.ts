import type { Schema } from '@/lib/api/contract';
export type CustomerStatus = 'ALL' | 'ACTIVE' | 'INACTIVE';
export type SalesCustomer = Schema<'SalesCustomer'>;

export interface CustomerQueryParams {
  status?: string;
  keyword?: string;
  page?: number;
  size?: number;
  type?: string;
}
