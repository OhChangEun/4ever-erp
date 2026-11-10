import type { Tab } from '@/app/types/NavigationType';
import type inventoryKo from '@/i18n/messages/inventory/ko.json';
import ShippingManagementList from '@/app/(private)/inventory/components/tabs/ShippingManagementList';
import InventoryList from '@/app/(private)/inventory/components/tabs/InventoryList';
import ReceivingManagementList from '@/app/(private)/inventory/components/tabs/ReceivingManagementList';

/** name 은 메시지 키(inventory.tabs.<키>). 글자는 InventoryClient 가 그릴 때 바꾼다 */
export type InventoryTab = Omit<Tab, 'name'> & { name: keyof typeof inventoryKo.tabs };

// 재고 관리 탭 전환
export const INVENTORY_TABS: InventoryTab[] = [
  { id: 'inventory', name: 'inventory', icon: 'ri-list-check-3', component: InventoryList },
  { id: 'shipping', name: 'shipping', icon: 'ri-truck-line', component: ShippingManagementList },
  {
    id: 'receiving',
    name: 'receiving',
    icon: 'ri-inbox-archive-line',
    component: ReceivingManagementList,
  },
];
