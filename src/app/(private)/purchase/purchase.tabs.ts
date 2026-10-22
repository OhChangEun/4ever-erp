import { Tab } from '@/app/types/NavigationType';
import PurchaseRequestListTab from '@/app/(private)/purchase/components/tabs/PurchaseRequestListTab';
import PurchaseOrderListTab from '@/app/(private)/purchase/components/tabs/PurchaseOrderListTab';
import SupplierListTab from '@/app/(private)/purchase/components/tabs/SupplierListTab';

// 구매 관리 탭 전환
export const PURCHASE_TABS: Tab[] = [
  {
    id: 'requests',
    name: '구매 요청',
    icon: 'ri-file-add-line',
    component: PurchaseRequestListTab,
  },
  {
    id: 'orders',
    name: '발주서',
    icon: 'ri-shopping-bag-3-line',
    component: PurchaseOrderListTab,
  },
  {
    id: 'suppliers',
    name: '공급업체 관리',
    icon: 'ri-building-line',
    component: SupplierListTab,
  },
];

// 공급사 계정용 탭 (발주서만)
export const SUPPLIER_PURCHASE_TABS: Tab[] = [
  {
    id: 'orders',
    name: '발주서',
    icon: 'ri-shopping-bag-3-line',
    component: PurchaseOrderListTab,
  },
];
