import type { Schema } from '@/lib/api/contract';
import { PageRequest } from '@/app/types/Page';

// 주별 수요/생산 데이터
export type WeekData = Schema<'WeekData'>;

export type MpsListResponse = Schema<'MpsListResponse'>;

export interface MpsListParams extends PageRequest {
  bomId: string;
  startDate: string;
  endDate: string;
}
