import { FCM, HRM, IM, MM, PP, SD, type Role } from '@/lib/authz/policy';
import dashboardKo from '@/i18n/messages/dashboard/ko.json';

/** 워크플로우 탭 코드 → 메시지 키(dashboard.workflow.tabs.<키>). 글자는 화면이 그릴 때 바꾼다 */
export type WorkflowTabKey = keyof typeof dashboardKo.workflow.tabs;
const TAB_KEYS: ReadonlySet<string> = new Set(Object.keys(dashboardKo.workflow.tabs));
const isTabKey = (code: string): code is WorkflowTabKey => TAB_KEYS.has(code);

export const workflowTabKey = (tabCode: string | undefined): WorkflowTabKey =>
  tabCode !== undefined && isTabKey(tabCode) ? tabCode : 'unknown';

export const getColorClasses = (color: string) => {
  // 모르는 색 이름이 오면 파랑. Partial 이라 없는 키는 undefined 로 잡힌다
  const colorMap: Partial<Record<string, { bg: string; icon: string }>> = {
    red: { bg: 'bg-red-100', icon: 'text-red-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600' },
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600' },
  };
  return colorMap[color] ?? { bg: 'bg-blue-100', icon: 'text-blue-600' };
};

/** 빠른 작업 메시지 키(dashboard.quickActions.items.<키>.title, .description) */
export type QuickActionKey = keyof typeof dashboardKo.quickActions.items;

export interface QuickAction {
  key: QuickActionKey;
  icon: string;
  color: string;
  href: string;
  roles: readonly Role[];
}

export const allActions: QuickAction[] = [
  // ------------ 구매 관리 ------------
  {
    key: 'purchaseRequest',
    icon: 'ri-shopping-cart-line',
    color: 'red',
    href: '/purchase',
    roles: [...MM, ...SD, ...IM, ...FCM, ...HRM, ...PP],
  },
  {
    key: 'purchaseOrders',
    icon: 'ri-file-text-line',
    color: 'indigo',
    href: 'purchase?tab=orders',
    roles: MM,
  },
  {
    key: 'purchaseInventory',
    icon: 'ri-box-3-line',
    color: 'purple',
    href: '/inventory',
    roles: MM,
  },
  {
    key: 'suppliers',
    icon: 'ri-building-line',
    color: 'orange',
    href: '/purchase?tab=suppliers',
    roles: MM,
  },
  // ------------ 영업 관리 ------------
  {
    key: 'salesQuotes',
    icon: 'ri-file-text-line',
    color: 'green',
    href: '/sales?tab=quotes',
    roles: SD,
  },
  {
    key: 'salesOrders',
    icon: 'ri-shopping-cart-line',
    color: 'indigo',
    href: '/sales?tab=orders',
    roles: SD,
  },
  {
    key: 'customers',
    icon: 'ri-user-line',
    color: 'purple',
    href: '/sales?tab=customers',
    roles: [...SD, 'ALL_ADMIN'],
  },
  {
    key: 'salesAnalytics',
    icon: 'ri-bar-chart-line',
    color: 'orange',
    href: '/sales?tab=analytics',
    roles: SD,
  },
  // ------------ 재고 관리 ------------
  {
    key: 'inventory',
    icon: 'ri-box-3-line',
    color: 'green',
    href: '/inventory?tab=inventory',
    roles: IM,
  },
  {
    key: 'shipping',
    icon: 'ri-truck-line',
    color: 'indigo',
    href: '/inventory?tab=shipping',
    roles: IM,
  },
  {
    key: 'receiving',
    icon: 'ri-shopping-cart-line',
    color: 'purple',
    href: '/inventory?tab=receiving',
    roles: IM,
  },
  {
    key: 'warehouses',
    icon: 'ri-store-2-line',
    color: 'orange',
    href: '/warehouse',
    roles: IM,
  },
  // ------------ 재무 관리 ------------
  {
    key: 'salesVouchers',
    icon: 'ri-archive-line',
    color: 'green',
    href: '/finance?tab=sales',
    roles: [...FCM, 'ALL_ADMIN'],
  },
  {
    key: 'purchaseVouchers',
    icon: 'ri-archive-line',
    color: 'indigo',
    href: '/finance?tab=purchase',
    roles: [...FCM, 'ALL_ADMIN'],
  },
  // ------------ 인적자원 관리 ------------
  {
    key: 'employees',
    icon: 'ri-user-3-line',
    color: 'green',
    href: '/hrm?tab=employee-management',
    roles: HRM,
  },
  {
    key: 'payroll',
    icon: 'ri-money-dollar-circle-line',
    color: 'indigo',
    href: '/hrm?tab=payroll-management',
    roles: HRM,
  },
  {
    key: 'attendance',
    icon: 'ri-time-line',
    color: 'purple',
    href: '/hrm?tab=attendance-management',
    roles: HRM,
  },
  {
    key: 'training',
    icon: 'ri-book-open-line',
    color: 'orange',
    href: '/hrm?tab=training-management',
    roles: HRM,
  },

  // ------------ 생산 관리 ------------
  {
    key: 'productionQuotes',
    icon: 'ri-file-list-3-line',
    color: 'green',
    href: '/production?tab=quotations',
    roles: PP,
  },
  {
    key: 'mps',
    icon: 'ri-calendar-check-line',
    color: 'indigo',
    href: '/production?tab=mps',
    roles: PP,
  },
  {
    key: 'mrp',
    icon: 'ri-calculator-line',
    color: 'purple',
    href: '/production?tab=mrp',
    roles: PP,
  },
  {
    key: 'mes',
    icon: 'ri-cpu-line',
    color: 'orange',
    href: '/production?tab=mes',
    roles: PP,
  },
  {
    key: 'bom',
    icon: 'ri-node-tree',
    color: 'teal',
    href: '/production?tab=bom',
    roles: PP,
  },

  //--------------고객사 & 공급사-----------------
  {
    key: 'editMaterials',
    icon: 'ri-shopping-cart-line',
    color: 'green',
    href: '/purchase/request/new',
    roles: ['SUPPLIER_ADMIN'],
  },
  {
    key: 'newQuote',
    icon: 'ri-file-text-line',
    color: 'indigo',
    href: '/production',
    roles: ['CUSTOMER_ADMIN'],
  },
  {
    key: 'editCompany',
    icon: 'ri-building-line',
    color: 'orange',
    href: '/companies',
    roles: ['SUPPLIER_ADMIN', 'CUSTOMER_ADMIN'],
  },
];
