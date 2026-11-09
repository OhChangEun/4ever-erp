import dynamic from 'next/dynamic';
import type { Tab } from '@/app/types/NavigationType';
import SalesQuoteList from '@/app/(private)/sales/components/tabs/SalesQuoteList';
import SalesOrderList from '@/app/(private)/sales/components/tabs/SalesOrderList';
import SalesCustomerList from '@/app/(private)/sales/components/tabs/SalesCustomerList';
import { INTERNAL_ROLES } from '@/lib/authz/policy';

// 매출 분석 탭만 recharts(첫 로드 121KB, gzip)를 쓴다. 탭을 열 때 받는다(성능 3 카드)
const SalesChart = dynamic(() => import('@/app/(private)/sales/components/tabs/SalesChart'));

// 영업 관리 탭 전환
export const SALES_TABS: Tab[] = [
  {
    id: 'quotes',
    name: '견적 관리',
    icon: 'ri-file-text-line',
    component: SalesQuoteList,
    roles: [...INTERNAL_ROLES, 'CUSTOMER_ADMIN'],
  },
  {
    id: 'orders',
    name: '주문 관리',
    icon: 'ri-shopping-cart-line',
    component: SalesOrderList,
    roles: [...INTERNAL_ROLES, 'CUSTOMER_ADMIN'],
  },
  {
    id: 'customers',
    name: '고객 관리',
    icon: 'ri-user-3-line',
    component: SalesCustomerList,
    roles: [...INTERNAL_ROLES],
  },
  {
    id: 'analytics',
    name: '매출 분석',
    icon: 'ri-bar-chart-line',
    component: SalesChart,
    roles: [...INTERNAL_ROLES],
  },
];
