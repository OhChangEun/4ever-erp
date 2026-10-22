import { Page } from '@/app/types/Page';

// 발주서 상태 코드
export type PurchaseOrderStatus = 'APPROVAL' | 'PENDING' | 'REJECTED' | 'DELIVERING' | 'DELIVERED';

// 발주서 주문 품목 상세
export interface PurchaseOrderItem {
  itemId: string;
  itemName: string; // 품목명
  quantity: number; // 수량
  uomName: string; // 단위
  unitPrice: number; // 단가
  totalPrice: number; // 금액
}

// 발주서 상세
export interface PurchaseOrderDetailResponse {
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
  items: PurchaseOrderItem[]; // 품목 목록
  totalAmount: number;
  note: string;
}

// 발주서 목록
// 개별 발주(Purchase Order) 항목
export interface PurchaseOrder {
  purchaseOrderId: string;
  purchaseOrderNumber: string; // 발주 번호
  supplierName: string; // 공급업체명
  itemsSummary: string; // 품목 요약
  orderDate: string; // 발주일 (YYYY-MM-DD)
  dueDate: string; // 납기일 (YYYY-MM-DD)
  totalAmount: number; // 총 금액
  statusCode: PurchaseOrderStatus; // 상태
}

// 최종 응답 타입
export interface PurchaseOrderListResponse {
  content: PurchaseOrder[];
  page: Page;
}
