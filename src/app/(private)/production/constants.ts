import type { ComponentType, ReactNode } from 'react';
import { type Tab } from '@/app/types/NavigationType';
import type productionKo from '@/i18n/messages/production/ko.json';
import QuotationTab from '@/app/(private)/production/components/tabs/QuotationTab';
import MrpTab from '@/app/(private)/production/components/tabs/MrpTab';
import BomTab from '@/app/(private)/production/components/tabs/BomTab';
import MpsTab from '@/app/(private)/production/components/tabs/MpsTab';
import MesTab from '@/app/(private)/production/components/tabs/MesTab';
import OrdersTab from '@/app/(private)/production/components/tabs/OrdersTab';
import PlannedOrdersTab from '@/app/(private)/production/components/tabs/PlannedOrdersTab';

/** name 은 메시지 키(production.tabs.<키>). 글자는 탭을 그리는 컴포넌트가 바꾼다 */
export type ProductionTabName = keyof typeof productionKo.tabs;
export type ProductionTab = Omit<Tab, 'name'> & { name: ProductionTabName };

// 생산 관리 탭 전환
export const PRODUCTION_TABS: ProductionTab[] = [
  {
    id: 'quotations',
    name: 'quotations',
    component: QuotationTab,
  },
  {
    id: 'mps',
    name: 'mps',
    component: MpsTab,
  },
  {
    id: 'mrp',
    name: 'mrp',
    component: MrpTab,
  },
  {
    id: 'mes',
    name: 'mes',
    component: MesTab,
  },
  {
    id: 'bom',
    name: 'bom',
    component: BomTab,
  },
];

/** MRP 하위 탭. 부모(MrpTab)가 탭 버튼을 넘겨 각 화면이 자기 툴바에 놓는다 */
export type MrpSubTab = Omit<Tab, 'component' | 'name'> & {
  name: ProductionTabName;
  component: ComponentType<{ tabButtons?: ReactNode }>;
};

export const MRP_TABS: MrpSubTab[] = [
  {
    id: 'requirements',
    name: 'requirements',
    component: OrdersTab,
  },
  {
    id: 'orders',
    name: 'plannedOrders',
    component: PlannedOrdersTab,
  },
];

// 가용 재고 상태 필터링
export type AvailableStockStatus = 'ALL' | 'CHECKED' | 'UNCHECKED';
