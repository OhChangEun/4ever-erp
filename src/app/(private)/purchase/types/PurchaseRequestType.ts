import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';
import { type KeywordRequest } from '@/app/types/KeywordType';
import { type DateRequest } from '@/app/types/Date';

// 구매 요청 목록 조회 파라미터
export interface PurchaseRequestListParams extends PageRequest, KeywordRequest, DateRequest {
  statusCode?: string;
}

// 구매 요청 목록 한 줄
export type PurchaseRequestListItem = Schema<'PurchaseRequestListItem'>;

// 구매 요청 목록 응답
export type PurchaseRequestListResponse = Schema<'PurchaseRequestListResponse'>;

// 구매 요청 상세
export type PurchaseRequestDetail = Schema<'PurchaseRequestDetail'>;

// 구매 요청 작성 폼 품목 (화면 관리용, id 포함)
export interface PurchaseRequestFormItem {
  id: string;
  itemName: string;
  quantity: number;
  uomName: string;
  expectedUnitPrice: number;
  preferredSupplierName: string;
  dueDate: string;
  purpose: string;
  note?: string;
}

// 비재고성 구매 요청 등록 바디
export type CreatePurchaseRequestBody = Schema<'CreatePurchaseRequestBody'>;

// 재고성 구매 요청 등록 품목
export type CreateStockPurchaseRequestItem = Schema<'CreateStockPurchaseRequestItem'>;

// 재고성 구매 요청 등록 바디
export type CreateStockPurchaseRequestBody = Schema<'CreateStockPurchaseRequestBody'>;
