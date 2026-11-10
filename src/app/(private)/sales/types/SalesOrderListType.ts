import type { QueryOf, Schema } from '@/lib/api/contract';
export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus =
  | 'ALL'
  | 'MATERIAL_PREPARATION'
  | 'IN_PRODUCTION'
  | 'READY_FOR_SHIPMENT'
  | 'DELIVERING'
  | 'DELIVERED';

export type Order = Schema<'Order'>;

// 이름은 계약 GET /business/sd/orders 의 쿼리에서 온다(게이트웨이 SdController.java:336,338 과 같다).
// 계약의 이름이 바뀌면 여기를 쓰는 화면이 tsc 에서 걸린다. 화면은 키를 다 채워 보낸다
export type OrderQueryParams = Required<QueryOf<'/business/sd/orders'>>;
