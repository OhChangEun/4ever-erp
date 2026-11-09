import type { Schema } from '@/lib/api/contract';
import { PageRequest } from '@/app/types/Page';

// MES 개별 항목
export type MesSummaryItem = Schema<'MesSummaryItem'>;

// MES 목록 응답 (페이지네이션 포함)
export type MesListResponse = Schema<'MesListResponse'>;

export interface FetchMesListParams extends PageRequest {
  quotationId?: string;
  status?: string;
}
