import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';
import { type KeywordRequest } from '@/app/types/KeywordType';
import { type DateRequest } from '@/app/types/Date';

// 발주서 상태 코드
export type PurchaseOrderStatus = 'APPROVAL' | 'PENDING' | 'REJECTED' | 'DELIVERING' | 'DELIVERED';

// 발주서 목록 조회 파라미터
export interface PurchaseOrderListParams extends PageRequest, KeywordRequest, DateRequest {
  statusCode?: string;
}

// 발주서 목록 한 줄
export type PurchaseOrderListItem = Schema<'PurchaseOrderListItem'>;

// 발주서 목록 응답
export type PurchaseOrderListResponse = Schema<'PurchaseOrderListResponse'>;

// 발주서 상세
export type PurchaseOrderDetail = Schema<'PurchaseOrderDetail'>;
