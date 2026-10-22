import { Page, PageRequest } from '@/app/types/Page';
import { KeywordRequest } from '@/app/types/KeywordType';
import { DateRequest } from '@/app/types/Date';

// 발주서 상태 코드
export type PurchaseOrderStatus = 'APPROVAL' | 'PENDING' | 'REJECTED' | 'DELIVERING' | 'DELIVERED';

// 발주서 목록 조회 파라미터
export interface PurchaseOrderListParams extends PageRequest, KeywordRequest, DateRequest {
  statusCode?: string;
}

// 발주서 목록 한 줄
export interface PurchaseOrderListItem {
  purchaseOrderId: string;
  purchaseOrderNumber: string; // 발주 번호
  supplierName: string; // 공급업체명
  itemsSummary: string; // 품목 요약
  orderDate: string; // 발주일 (YYYY-MM-DD)
  dueDate: string; // 납기일 (YYYY-MM-DD)
  totalAmount: number; // 총 금액
  statusCode: PurchaseOrderStatus; // 상태
}

// 발주서 목록 응답
export interface PurchaseOrderListResponse {
  content: PurchaseOrderListItem[];
  page: Page;
}

// 발주서 상세 품목
export interface PurchaseOrderDetailItem {
  itemId: string;
  itemName: string; // 품목명
  quantity: number; // 수량
  uomName: string; // 단위
  unitPrice: number; // 단가
  totalPrice: number; // 금액
}

// 발주서 상세
export interface PurchaseOrderDetail {
  statusCode: string;
  dueDate: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  orderDate: string;
  supplierId: string;
  supplierNumber: string;
  supplierName: string;
  managerPhone: string;
  managerEmail: string;
  items: PurchaseOrderDetailItem[]; // 품목 목록
  totalAmount: number;
  note: string;
}
