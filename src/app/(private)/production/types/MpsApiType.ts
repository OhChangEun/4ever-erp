import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';

export type MpsListResponse = Schema<'MpsListResponse'>;

export interface MpsListParams extends PageRequest {
  bomId: string;
  startDate: string;
  endDate: string;
}
