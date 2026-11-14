import { monthStart, todayKey } from '@/mocks/handlers/seed';

/** 매입 전표와 급여는 달마다 만든다(카드 "데모 목록 인사 재무"). 지난달 첫 공급사, 첫 직원의 것을 쓴다 */
const LAST_MONTH = monthStart(todayKey(), 1).slice(0, 7).replace('-', '');
export const AP_INVOICE_ID = `inv-ap-${LAST_MONTH}-001`;
export const PAYROLL_ID = `pay-${LAST_MONTH}-001`;

/**
 * 목록과 짝인 상세 GET 19개(카드 "목 데이터 현실성" 조사 1)의 계약 경로와 목록 기본 행의 id.
 * 이 상세들은 목록에 없는 id 에 404 를 준다(카드 "없는 건은 404"). 계약 테스트와 핸들러 테스트가 같이 쓴다
 */
export const DETAIL_PAIRS: Record<string, string> = {
  '/business/sd/quotations/{id}': 'qt-001',
  '/business/sd/orders/{id}': 'so-001',
  '/business/sd/customers/{id}': 'cus-001',
  '/scm-pp/mm/purchase-requisitions/{purchaseRequestId}': 'pr-001',
  '/scm-pp/mm/purchase-orders/{purchaseOrderId}': 'po-001',
  '/scm-pp/mm/supplier/{supplierId}': 'sup-001',
  '/business/fcm/invoice/ap/{invoiceId}': AP_INVOICE_ID,
  '/business/fcm/invoice/ar/{invoiceId}': 'inv-ar-001',
  '/business/hrm/positions/{positionId}': 'pos-001',
  '/business/hrm/payroll/{payrollId}': PAYROLL_ID,
  '/business/hrm/training/employee/{employeeId}': 'emp-001',
  '/business/hrm/program/{programId}': 'prog-001',
  '/scm-pp/iv/items/{itemId}': 'item-1001',
  '/scm-pp/sales-orders/production/{itemId}': 'so-001',
  '/scm-pp/sales-orders/ready-to-ship/{itemId}': 'so-002',
  '/scm-pp/iv/warehouses/{warehouseId}': 'wh-001',
  '/scm-pp/pp/products/{productId}': 'prod-001',
  '/scm-pp/pp/boms/{bomId}': 'bom-001',
  '/scm-pp/pp/mes/{mesId}': 'mes-001',
};

/** 계약 경로 템플릿의 `{...}` 를 id 로 채운다 */
export const detailPath = (template: string, id: string) => template.replace(/\{[^}]+\}/, id);
