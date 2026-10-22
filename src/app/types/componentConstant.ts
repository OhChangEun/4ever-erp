import { Tab } from './NavigationType';
import InvoiceList from '@/app/(private)/finance/components/tabs/InvoiceList';
import SalesQuoteList from '@/app/(private)/sales/components/tabs/SalesQuoteList';
import SalesOrderList from '@/app/(private)/sales/components/tabs/SalesOrderList';
import SalesCustomerList from '@/app/(private)/sales/components/tabs/SalesCustomerList';
import SalesChart from '@/app/(private)/sales/components/tabs/SalesChart';
import ShippingManagementList from '@/app/(private)/inventory/components/tabs/ShippingManagementList';
import InventoryList from '@/app/(private)/inventory/components/tabs/InventoryList';
import ReceivingManagementList from '@/app/(private)/inventory/components/tabs/ReceivingManagementList';
import { ALL } from './role.constant';

// 재무 관리 탭 전환
export const FINANCE_TABS: Tab[] = [
  {
    id: 'sales',
    name: '매출 전표 관리',
    icon: 'ri-money-dollar-circle-line',
    component: InvoiceList,
    roles: [...ALL, 'SUPPLIER_ADMIN'],
  },
  {
    id: 'purchase',
    name: '매입 전표 관리',
    icon: 'ri-shopping-cart-line',
    component: InvoiceList,
    roles: [...ALL, 'CUSTOMER_ADMIN'],
  },
];

// 영업 관리 탭 전환
export const SALES_TABS: Tab[] = [
  {
    id: 'quotes',
    name: '견적 관리',
    icon: 'ri-file-text-line',
    component: SalesQuoteList,
    roles: [...ALL, 'CUSTOMER_ADMIN'],
  },
  {
    id: 'orders',
    name: '주문 관리',
    icon: 'ri-shopping-cart-line',
    component: SalesOrderList,
    roles: [...ALL, 'CUSTOMER_ADMIN'],
  },
  {
    id: 'customers',
    name: '고객 관리',
    icon: 'ri-user-3-line',
    component: SalesCustomerList,
    roles: [...ALL],
  },
  {
    id: 'analytics',
    name: '매출 분석',
    icon: 'ri-bar-chart-line',
    component: SalesChart,
    roles: [...ALL],
  },
];

// 재고 관리 탭 전환
export const INVENTORY_TABS: Tab[] = [
  { id: 'inventory', name: '재고 목록', icon: 'ri-list-check-3', component: InventoryList },
  { id: 'shipping', name: '출고 관리', icon: 'ri-truck-line', component: ShippingManagementList },
  {
    id: 'receiving',
    name: '입고 관리',
    icon: 'ri-inbox-archive-line',
    component: ReceivingManagementList,
  },
];
