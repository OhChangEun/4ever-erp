import type { Schema } from '@/lib/api/contract';
export type ProductionListResponse = Schema<'ProductionListResponse'>;

export type ReadyToShipListResponse = Schema<'ReadyToShipListResponse'>;

export interface ManageMentCommonQueryParams {
  page?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
}
