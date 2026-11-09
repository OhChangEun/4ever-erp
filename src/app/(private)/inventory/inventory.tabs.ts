import type { Tab } from '@/app/types/NavigationType';
import ShippingManagementList from '@/app/(private)/inventory/components/tabs/ShippingManagementList';
import InventoryList from '@/app/(private)/inventory/components/tabs/InventoryList';
import ReceivingManagementList from '@/app/(private)/inventory/components/tabs/ReceivingManagementList';

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
