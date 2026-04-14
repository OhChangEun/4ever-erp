import {
  ok,
  okNoData,
  error,
  shouldError,
  now,
  isoNow,
  stat,
  statResponse,
  makePage,
} from '../utils';

const mockUserInfo = {
  id: 1,
  name: '홍길동',
  email: 'hong@test.com',
  role: 'USER',
};

const mockProfileInfo = {
  name: '홍길동',
  employeeNumber: 'EMP-2026-001',
  department: '영업팀',
  position: '팀장',
  hireDate: '2022-03-01',
  serviceYears: '3',
  email: 'user@everp.co.kr',
  phoneNumber: '010-1234-5678',
  address: '서울특별시 강남구 테헤란로 123',
  companyName: '에버피',
  baseAddress: '서울특별시 강남구 테헤란로 123',
  detailAddress: '10층',
  officePhone: '02-123-4567',
  businessNumber: '123-45-67890',
  customerName: '홍길동',
};

const mockNotificationList = {
  content: [
    {
      notificationId: 'ntf-001',
      notificationTitle: '발주 승인 요청',
      notificationMessage: 'PO-2026-001 승인 요청이 도착했습니다.',
      linkType: 'PURCHASE_ORDER',
      linkId: 'po-001',
      source: 'PR',
      createdAt: isoNow,
      isRead: false,
    },
    {
      notificationId: 'ntf-002',
      notificationTitle: '재고 부족 경고',
      notificationMessage: 'ITEM-1002의 재고가 안전재고 이하입니다.',
      linkType: 'INVENTORY',
      linkId: 'item-1002',
      source: 'IM',
      createdAt: isoNow,
      isRead: true,
    },
  ],
  page: makePage(0, 10, 2),
};

const mockSalesStats = statResponse({
  sales_amount: stat,
  new_orders_count: stat,
});

const mockCustomerSalesStats = statResponse({
  quotation_count: stat,
});

const mockFinanceStats = statResponse({
  total_purchases: stat,
  net_profit: stat,
  total_sales: stat,
});

const mockCustomerSupplierStats = statResponse({
  total_amount: stat,
});

const mockDashboardStats = statResponse({
  total_sales: stat,
  total_purchases: stat,
  net_profit: stat,
  total_employees: stat,
});

const mockInventoryStats = statResponse({
  total_stock: stat,
  store_complete: stat,
  store_pending: stat,
  delivery_complete: stat,
  delivery_pending: stat,
});

const mockWarehouseStats = statResponse({
  total_warehouse: stat,
  in_operation_warehouse: stat,
});

const mockLowStockStats = statResponse({
  total_emergency: stat,
  total_warning: stat,
});

const mockPurchaseStats = statResponse({
  purchaseOrderAmount: stat,
  purchaseRequestCount: stat,
});

const mockSupplierOrderStats = statResponse({
  orderCount: stat,
});

const mockProductionStats = statResponse({
  production_in: stat,
  production_completed: stat,
  bom_count: stat,
});

// ---- 낙관적 락 시뮬레이션: BOM 서버 측 버전 상태 ----
// 실제 백엔드라면 DB의 version 컬럼이 이 역할을 함
// MSW에서는 모듈 레벨 변수로 서버 버전을 흉내냄
const bomServerVersions: Record<string, string> = {};
const getBomVersion = (bomId: string) => bomServerVersions[bomId] ?? 'v1';
const bumpBomVersion = (bomId: string): string => {
  const current = getBomVersion(bomId);
  const next = `v${parseInt(current.replace('v', ''), 10) + 1}`;
  bomServerVersions[bomId] = next;
  return next;
};

const mockHrmStats = statResponse({
  totalEmployeeCount: stat,
  newEmployeeCount: stat,
});

export {
  now,
  isoNow,
  stat,
  statResponse,
  makePage,
  ok,
  okNoData,
  error,
  shouldError,
  mockUserInfo,
  mockProfileInfo,
  mockNotificationList,
  mockSalesStats,
  mockCustomerSalesStats,
  mockFinanceStats,
  mockCustomerSupplierStats,
  mockDashboardStats,
  mockInventoryStats,
  mockWarehouseStats,
  mockLowStockStats,
  mockPurchaseStats,
  mockSupplierOrderStats,
  mockProductionStats,
  bomServerVersions,
  getBomVersion,
  bumpBomVersion,
  mockHrmStats,
};
