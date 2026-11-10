import { type Tab } from '@/app/types/NavigationType';
import type purchaseKo from '@/i18n/messages/purchase/ko.json';
import PurchaseRequestListTab from '@/app/(private)/purchase/components/tabs/PurchaseRequestListTab';
import PurchaseOrderListTab from '@/app/(private)/purchase/components/tabs/PurchaseOrderListTab';
import SupplierListTab from '@/app/(private)/purchase/components/tabs/SupplierListTab';

/** name 은 메시지 키(purchase.tabs.<키>). 글자는 PurchaseClient 가 그릴 때 바꾼다 */
export type PurchaseTab = Omit<Tab, 'name'> & { name: keyof typeof purchaseKo.tabs };

// 구매 관리 탭 전환
export const PURCHASE_TABS: PurchaseTab[] = [
  {
    id: 'requests',
    name: 'requests',
    icon: 'ri-file-add-line',
    component: PurchaseRequestListTab,
  },
  {
    id: 'orders',
    name: 'orders',
    icon: 'ri-shopping-bag-3-line',
    component: PurchaseOrderListTab,
  },
  {
    id: 'suppliers',
    name: 'suppliers',
    icon: 'ri-building-line',
    component: SupplierListTab,
  },
];

// 공급사 계정용 탭 (발주서만)
export const SUPPLIER_PURCHASE_TABS: PurchaseTab[] = [
  {
    id: 'orders',
    name: 'orders',
    icon: 'ri-shopping-bag-3-line',
    component: PurchaseOrderListTab,
  },
];
