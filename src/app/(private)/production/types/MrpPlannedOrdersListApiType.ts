import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';

// MRP 계획 주문 목록 타입
export type MrpPlannedOrderList = Schema<'MrpPlannedOrderList'>;

// MRP 계획 주문 목록 최상위 응답 타입
export type MrpPlannedOrdersListResponse = Schema<'MrpPlannedOrdersListResponse'>;

export interface FetchMrpPlannedOrdersListParams extends PageRequest {
  status?: string;
  quotationId?: string;
}
