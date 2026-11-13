import dynamic from 'next/dynamic';
import type { Tab } from '@/app/types/NavigationType';
import type financeKo from '@/i18n/messages/finance/ko.json';
import InvoiceList from '@/app/(private)/finance/components/tabs/InvoiceList';
import { FINANCE_ANALYTICS_ROLES, INTERNAL_ROLES } from '@/lib/authz/policy';

// 재무 현황은 탭을 열 때만 받는다(영업 매출 분석과 같은 방식)
const FinanceOverview = dynamic(
  () => import('@/app/(private)/finance/components/overview/FinanceOverview'),
);

// 재무 관리 탭 전환. 도메인마다 자기 탭만 import 한다(예전 공용 componentConstant 는 재무 화면이
// 영업 차트까지 끌어와 recharts 121KB 를 첫 로드에 받았다, 성능 3 카드)
/** name 은 메시지 키(finance.tabs.<키>). 글자는 FinanceTabs 가 그릴 때 바꾼다 */
export type FinanceTab = Omit<Tab, 'name'> & { name: keyof typeof financeKo.tabs };

export const FINANCE_TABS: FinanceTab[] = [
  {
    id: 'sales',
    name: 'sales',
    component: InvoiceList,
    roles: [...INTERNAL_ROLES, 'SUPPLIER_ADMIN'],
  },
  {
    id: 'purchase',
    name: 'purchase',
    component: InvoiceList,
    roles: [...INTERNAL_ROLES, 'CUSTOMER_ADMIN'],
  },
  {
    // 회사 전체 손익이라 사내 재무 역할만(시각화 4 결정 1). API 도 같은 표로 막는다. 맨 뒤라 기본 탭은 그대로
    id: 'overview',
    name: 'overview',
    component: FinanceOverview,
    roles: [...FINANCE_ANALYTICS_ROLES],
  },
];
