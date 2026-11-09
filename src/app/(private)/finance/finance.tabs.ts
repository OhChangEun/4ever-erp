import type { Tab } from '@/app/types/NavigationType';
import InvoiceList from '@/app/(private)/finance/components/tabs/InvoiceList';
import { INTERNAL_ROLES } from '@/lib/authz/policy';

// 재무 관리 탭 전환. 도메인마다 자기 탭만 import 한다(예전 공용 componentConstant 는 재무 화면이
// 영업 차트까지 끌어와 recharts 121KB 를 첫 로드에 받았다, 성능 3 카드)
export const FINANCE_TABS: Tab[] = [
  {
    id: 'sales',
    name: '매출 전표 관리',
    icon: 'ri-money-dollar-circle-line',
    component: InvoiceList,
    roles: [...INTERNAL_ROLES, 'SUPPLIER_ADMIN'],
  },
  {
    id: 'purchase',
    name: '매입 전표 관리',
    icon: 'ri-shopping-cart-line',
    component: InvoiceList,
    roles: [...INTERNAL_ROLES, 'CUSTOMER_ADMIN'],
  },
];
