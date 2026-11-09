import type { Schema } from '@/lib/api/contract';
import { PageRequest } from '@/app/types/Page';

export type MrpOrdersListData = Schema<'MrpOrdersListData'>;

// MRP 순소요 목록 최상위 응답 타입
export type MrpOrdersListResponse = Schema<'MrpOrdersListResponse'>;

export interface FetchMrpOrdersListParams extends PageRequest {
  bomId?: string;
  quotationId: string;
  availableStatusCode: string;
}
