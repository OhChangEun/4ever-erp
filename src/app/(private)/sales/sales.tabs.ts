import dynamic from 'next/dynamic';
import type { Tab } from '@/app/types/NavigationType';
import type salesKo from '@/i18n/messages/sales/ko.json';
import SalesQuoteList from '@/app/(private)/sales/components/tabs/SalesQuoteList';
import SalesOrderList from '@/app/(private)/sales/components/tabs/SalesOrderList';
import SalesCustomerList from '@/app/(private)/sales/components/tabs/SalesCustomerList';
import { INTERNAL_ROLES } from '@/lib/authz/policy';

// 매출 분석 탭만 recharts(첫 로드 121KB, gzip)를 쓴다. 탭을 열 때 받는다(성능 3 카드)
const SalesChart = dynamic(() => import('@/app/(private)/sales/components/tabs/SalesChart'));

/** name 은 메시지 키(sales.tabs.<키>). 글자는 SalesTabs 가 그릴 때 바꾼다 */
export type SalesTab = Omit<Tab, 'name'> & { name: keyof typeof salesKo.tabs };

// 영업 관리 탭 전환
export const SALES_TABS: SalesTab[] = [
  {
    id: 'quotes',
    name: 'quotes',
    component: SalesQuoteList,
    roles: [...INTERNAL_ROLES, 'CUSTOMER_ADMIN'],
  },
  {
    id: 'orders',
    name: 'orders',
    component: SalesOrderList,
    roles: [...INTERNAL_ROLES, 'CUSTOMER_ADMIN'],
  },
  {
    id: 'customers',
    name: 'customers',
    component: SalesCustomerList,
    roles: [...INTERNAL_ROLES],
  },
  {
    id: 'analytics',
    name: 'analytics',
    component: SalesChart,
    roles: [...INTERNAL_ROLES],
  },
];
