import 'server-only';
import type { PortalRole } from './roles';

/**
 * 포털 화면의 데이터. 서버가 없어 erp 목과 같은 모양의 고정 값이다(verified=false).
 * 공급사는 받은 발주, 고객사는 낸 주문, 사내 관리자는 둘 다.
 */
export interface PortalOrder {
  number: string;
  item: string;
  quantity: number;
  amount: number;
  dueDate: string;
  status: string;
}

const PURCHASE_ORDERS: PortalOrder[] = [
  {
    number: 'PO-2026-0412',
    item: '베어링 B',
    quantity: 200,
    amount: 840000,
    dueDate: '2026-11-14',
    status: '납품 대기',
  },
  {
    number: 'PO-2026-0418',
    item: '구리선',
    quantity: 150,
    amount: 1800000,
    dueDate: '2026-11-20',
    status: '승인',
  },
  {
    number: 'PO-2026-0421',
    item: '볼트 M6',
    quantity: 5000,
    amount: 600000,
    dueDate: '2026-11-25',
    status: '승인',
  },
];

const SALES_ORDERS: PortalOrder[] = [
  {
    number: 'SO-2026-0311',
    item: '모터 A',
    quantity: 40,
    amount: 3280000,
    dueDate: '2026-11-18',
    status: '생산 중',
  },
  {
    number: 'SO-2026-0315',
    item: '모터 A',
    quantity: 25,
    amount: 2050000,
    dueDate: '2026-12-02',
    status: '접수',
  },
];

export const ordersFor = (role: PortalRole) => ({
  purchase: role === 'CUSTOMER_ADMIN' ? null : PURCHASE_ORDERS,
  sales: role === 'SUPPLIER_ADMIN' ? null : SALES_ORDERS,
});
