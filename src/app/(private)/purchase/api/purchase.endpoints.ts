import { API_BASE_URL } from '@/app/types/api';

export const PURCHASE_BASE_PATH = `${API_BASE_URL}/scm-pp/mm`;

export const PURCHASE_ENDPOINTS = {
  // --- 드롭다운 ---
  PURCHASE_REQUEST_STATUS_OPTIONS: `${PURCHASE_BASE_PATH}/purchase-requisition/status/toggle`,
  PURCHASE_REQUEST_SEARCH_TYPE_OPTIONS: `${PURCHASE_BASE_PATH}/purchase-requisition/search-type/toggle`,
  PURCHASE_ORDER_STATUS_OPTIONS: `${PURCHASE_BASE_PATH}/purchase-orders/status/toggle`,
  PURCHASE_ORDER_SEARCH_TYPE_OPTIONS: `${PURCHASE_BASE_PATH}/purchase-orders/search-type/toggle`,
  SUPPLIER_CATEGORY_OPTIONS: `${PURCHASE_BASE_PATH}/supplier/category/toggle`,
  SUPPLIER_SEARCH_TYPE_OPTIONS: `${PURCHASE_BASE_PATH}/supplier/search-type/toggle`,
  SUPPLIER_STATUS_OPTIONS: `${PURCHASE_BASE_PATH}/supplier/status/toggle`,

  // --- 통계 ---
  STATISTICS: `${PURCHASE_BASE_PATH}/statistics`, // MM 통계 조회
  SUPPLIER_ORDERS_STATISTICS: `${PURCHASE_BASE_PATH}/supplier/orders/statistics`, // 공급사 발주서 통계 조회

  // --- 구매 요청 ---
  PURCHASE_REQUESTS: `${PURCHASE_BASE_PATH}/purchase-requisitions`, // 구매 요청 목록 조회, 비재고성 자재 구매 요청서 생성
  STOCK_PURCHASE_REQUESTS: `${PURCHASE_BASE_PATH}/stock-purchase-requisitions`, // 재고성 자재 구매 요청서 생성

  PURCHASE_REQUEST_DETAIL: (purchaseRequestId: string) =>
    `${PURCHASE_BASE_PATH}/purchase-requisitions/${purchaseRequestId}`, // 구매 요청서 상세조회, 수정, 삭제
  PURCHASE_REQUEST_APPROVE: (purchaseRequestId: string) =>
    `${PURCHASE_BASE_PATH}/purchase-requisitions/${purchaseRequestId}/release`, // 구매요청서 승인 (서버 path 는 release)
  PURCHASE_REQUEST_REJECT: (purchaseRequestId: string) =>
    `${PURCHASE_BASE_PATH}/purchase-requisitions/${purchaseRequestId}/reject`, // 구매요청서 반려

  // --- 발주서 ---
  PURCHASE_ORDERS: `${PURCHASE_BASE_PATH}/purchase-orders`, // 발주서 목록 조회
  PURCHASE_ORDER_APPROVE: (purchaseOrderId: string) =>
    `${PURCHASE_BASE_PATH}/purchase-orders/${purchaseOrderId}/approve`, // 발주서 승인
  PURCHASE_ORDER_REJECT: (purchaseOrderId: string) =>
    `${PURCHASE_BASE_PATH}/purchase-orders/${purchaseOrderId}/reject`, // 발주서 반려
  PURCHASE_ORDER_DETAIL: (purchaseOrderId: string) =>
    `${PURCHASE_BASE_PATH}/purchase-orders/${purchaseOrderId}`, // 발주서 상세 조회
  PURCHASE_ORDER_DELIVERY: (purchaseOrderId: string) =>
    `${PURCHASE_BASE_PATH}/${purchaseOrderId}/start-delivery`, // 배송 시작
  // --- 공급업체 ---
  SUPPLIER: `${PURCHASE_BASE_PATH}/supplier`, // 공급업체 목록 조회, 등록
  SUPPLIER_DETAIL: (supplierId: string) => `${PURCHASE_BASE_PATH}/supplier/${supplierId}`, // 공급업체 상세 조회, 수정
};
