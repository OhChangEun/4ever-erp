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
    icon: 'ri-file-text-line',
    component: QuotationTab,
  },
  {
    id: 'mps',
    name: 'mps',
    icon: 'ri-calendar-schedule-line',
    component: MpsTab,
  },
  {
    id: 'mrp',
    name: 'mrp',
    icon: 'ri-settings-3-line',
    component: MrpTab,
  },
  {
    id: 'mes',
    name: 'mes',
    icon: 'ri-settings-3-line',
    component: MesTab,
  },
  {
    id: 'bom',
    name: 'bom',
    icon: 'ri-file-list-3-line',
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
    icon: 'ri-file-list-3-line',
    component: OrdersTab,
  },
  {
    id: 'orders',
    name: 'plannedOrders',
    icon: 'ri-shopping-cart-line',
    component: PlannedOrdersTab,
  },
];

// 가용 재고 상태 필터링
export type AvailableStockStatus = 'ALL' | 'CHECKED' | 'UNCHECKED';

// MES 상태 필터
export type MesStatusCode = 'ALL' | 'WAITING' | 'IN_PROGRESS';

export type ProductType =
  'ALL' | 'DOOR_PANEL' | 'HOOD_PANEL' | 'FENDER_PANEL' | 'TRUNK_LID' | 'ROOF_PANEL';

// MRP 순소요 상태 필터
export type MrpOrderStatus = 'ALL' | 'SUFFICIENT' | 'INSUFFICIENT';

// MRP 계획 주문 상태 필터
export type MrpPlannedOrderStatus = 'ALL' | 'PENDING' | 'PLANNED' | 'APPROVED' | 'REJECTED';
