// 공통 API Base URL
// 기본값: /api/proxy (BFF) - 브라우저는 세션 쿠키만 보내고, 프록시가 서버에서 Bearer로 바꿔 백엔드에 전달
// 백엔드 주소는 서버 전용 env BACKEND_API_URL 로 지정 (없으면 이 앱의 목 API /api 로 전달)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/proxy';

export const SALES_BASE_PATH = `${API_BASE_URL}/business/sd`;
export const FINANCE_BASE_PATH = `${API_BASE_URL}/business/fcm`;
export const DASHBOARD_BASE_PATH = `${API_BASE_URL}/dashboard`;
export const INVENTORY_BASE_PATH = `${API_BASE_URL}/scm-pp`;
export const HRM_BASE_PATH = `${API_BASE_URL}/business/hrm`;
export const PROFILE_BASE_PATH = `${API_BASE_URL}/business/profile`;

// 공통 응답 타입
export interface ApiResponse<T> {
  status: number;
  success: boolean;
  message: string;
  data: T;
}
export interface ApiResponseNoData {
  status: number;
  success: boolean;
  message: string;
}

// ----------------------- SALES -----------------------
export const SALES_ENDPOINTS = {
  STATS: `${SALES_BASE_PATH}/statistics`,
  QUOTES_LIST: `${SALES_BASE_PATH}/quotations`,
  QUOTE_DETAIL: (id: string) => `${SALES_BASE_PATH}/quotations/${id}`,
  QUOTE_CONFIRM: `${SALES_BASE_PATH}/quotations/confirm`,
  INVENTORY_CHECK: `${SALES_BASE_PATH}/quotations/inventory/check`,
  QUOTE_DELIVERY_PROCESS: (id: string) => `${SALES_BASE_PATH}/quotations/${id}/approve-order`,
  ORDERS_LIST: `${SALES_BASE_PATH}/orders`,
  ORDER_DETAIL: (id: string) => `${SALES_BASE_PATH}/orders/${id}`,
  CUSTOMERS_LIST: `${SALES_BASE_PATH}/customers`,
  CUSTOMER_DETAIL: (id: string) => `${SALES_BASE_PATH}/customers/${id}`,
  EDIT_CUSTOMER: (id: string) => `${SALES_BASE_PATH}/customers/${id}`,
  ANALYTICS: `${SALES_BASE_PATH}/analytics/sales`,
  NEW_ORDER: `${SALES_BASE_PATH}/quotations`,
  NEW_QUOTE_ITEM_TOGGLE: `${INVENTORY_BASE_PATH}/product/item/toggle`,
  CSUTOMER_STATISTICS: `${SALES_BASE_PATH}/quotations/customer/count`,
} as const;

// ----------------------- FINANCE -----------------------

export const FINANCE_ENDPOINTS = {
  STATISTICS: `${FINANCE_BASE_PATH}/statictics`,
  PURCHASE_INVOICES_LIST: `${FINANCE_BASE_PATH}/invoice/ap`,
  PURCHASE_INVOICE_DETAIL: (invoiceId: string) => `${FINANCE_BASE_PATH}/invoice/ap/${invoiceId}`,
  SALES_INVOICES_LIST: `${FINANCE_BASE_PATH}/invoice/ar`,
  SALES_INVOICE_DETAIL: (invoiceId: string) => `${FINANCE_BASE_PATH}/invoice/ar/${invoiceId}`,

  PURCHASE_INVOICE_REQUEST: (invoiceId: string) =>
    `${FINANCE_BASE_PATH}/invoice/ap/receivable/request?invoiceId=${invoiceId}`,
  SALES_INVOICE_COMPLETE: (invoiceId: string) =>
    `${FINANCE_BASE_PATH}/invoice/ar/${invoiceId}/receivable/complete`,
  SUPPLIER_AP_COMPLETE: (invoiceId: string) =>
    `${FINANCE_BASE_PATH}/invoice/ap/${invoiceId}/payable/complete`,
  // SUPPLIER_AP_COMPLETE: (invoiceId: string) =>
  //   `${FINANCE_BASE_PATH}/invoice/ap/${invoiceId}/payable/complete`,
  CUSTOMER_STATISTICS: `${FINANCE_BASE_PATH}/statistics/customer/total-purchases`,
  SUPPLIER_STATISTICS: `${FINANCE_BASE_PATH}/statistics/supplier/total-sales`,
} as const;

// ----------------------- DASHBOARD -----------------------
export const DASHBOARD_ENDPOINTS = {
  STATS: `${DASHBOARD_BASE_PATH}/statistics`,
  WORKFLOW_STATUS: `${DASHBOARD_BASE_PATH}/workflows`,
} as const;

// ----------------------- INVENTORY -----------------------
export const INVENTORY_ENDPOINTS = {
  STATS: `${INVENTORY_BASE_PATH}/iv/statistic`,
  INVENTORY_LIST: `${INVENTORY_BASE_PATH}/iv/inventory-items`,
  INVENTORY_DETAIL: (itemId: string) => `${INVENTORY_BASE_PATH}/iv/items/${itemId}`,
  LOW_STOCK: `${INVENTORY_BASE_PATH}/iv/shortage/preview`,
  RECENT_STOCK_MOVEMENT: `${INVENTORY_BASE_PATH}/iv/stock-transfers`,
  PRODUCTION_LIST: `${INVENTORY_BASE_PATH}/sales-orders/production`,
  READY_TO_SHIP_LIST: `${INVENTORY_BASE_PATH}/sales-orders/ready-to-ship`,
  PENDING_LIST: `${INVENTORY_BASE_PATH}/purchase-orders/receiving`,
  RECEIVED_LIST: `${INVENTORY_BASE_PATH}/purchase-orders/received`,
  PRODUCTIONDETAIL: (itemId: string) => `${INVENTORY_BASE_PATH}/sales-orders/production/${itemId}`,
  READY_TO_SHIP_DETAIL: (itemId: string) =>
    `${INVENTORY_BASE_PATH}/sales-orders/ready-to-ship/${itemId}`,
  MARKAS_READY_TO_SHIP_DETAIL: (orderId: string) =>
    `${INVENTORY_BASE_PATH}/sales-orders/${orderId}/status`,
  ADD_MATERIALS: `${INVENTORY_BASE_PATH}/iv/items`,
  MATERIALS_LIST: `${INVENTORY_BASE_PATH}/iv/items/info`,
  EDIT_SAFETY_STOCK: (itemId: string, safetyStock: number) =>
    `${INVENTORY_BASE_PATH}/iv/items/${itemId}/safety-stock?safetyStock=${safetyStock}`,
  // ---------- 메뉴 조회 ----------
  ITEM_TOGGLE: `${INVENTORY_BASE_PATH}/iv/items/toggle`,
  WAREHOUSE_TOGGLE: `${INVENTORY_BASE_PATH}/iv/warehouses/dropdown`,
} as const;

// ----------------------- LOWSTOCK -----------------------
export const LOWSTOCK_ENDPOINTS = {
  STATS: `${INVENTORY_BASE_PATH}/iv/shortage/count/critical/statistic`,
  LOW_STOCK_LIST: `${INVENTORY_BASE_PATH}/iv/shortage`,
};

// ----------------------- WAREHOUSE -----------------------
export const WAREHOUSE_ENDPOINTS = {
  STATS: `${INVENTORY_BASE_PATH}/iv/warehouses/statistic`,
  WAREHOUSE_LIST: `${INVENTORY_BASE_PATH}/iv/warehouses`,
  WAREHOUSE_DETAIL: (warehouseId: string) => `${INVENTORY_BASE_PATH}/iv/warehouses/${warehouseId}`,
  WAREHOUSE_MANAGE: (warehouseId: string) => `${INVENTORY_BASE_PATH}/iv/warehouses/${warehouseId}`,
  ADD_WAREHOUSE: `${INVENTORY_BASE_PATH}/iv/warehouses`,
  WAREHOUSE_MANAGER_INFO: `${INVENTORY_BASE_PATH}/iv/warehouses/managers/toggle`,
};

// ----------------------- USER -----------------------
export const USER_ENDPOINTS = {
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  USER_INFO: '/api/me',
  USER_PROFILE_INFO: `${HRM_BASE_PATH}/employees/by-internel-user`,
};

// ----------------------- PROFILE -----------------------
export const PROFILE_ENDPOINTS = {
  VACATION: `${HRM_BASE_PATH}/leave/request`,
  PROFILE_INFO: `${PROFILE_BASE_PATH}`,
  ATTENDANCE_RECORDS: `${PROFILE_BASE_PATH}/attendance-records`,
  TODAY_ATTENDANCE: `${PROFILE_BASE_PATH}/today-attendance`,
  AVAILABLE_TRAINING: `${PROFILE_BASE_PATH}/trainings/available`,
  COMPLETED_TRAINING: `${PROFILE_BASE_PATH}/trainings/completed`,
  PROGRESS_TRAINING: `${PROFILE_BASE_PATH}/trainings/in-progress`,
  REGISTER_TRAINING: (trainingId: string) =>
    `${PROFILE_BASE_PATH}/trainings/request?trainingId=${trainingId}`,
  CHECK_IN: `${HRM_BASE_PATH}/attendance/check-in`,
  CHECK_OUT: `${HRM_BASE_PATH}/attendance/check-out`,
  EDIT_PROFILE: `${PROFILE_BASE_PATH}/employees/profile/update`,
};
