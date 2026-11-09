import type { Schema } from '@/lib/api/contract';
// 현재 VoucherDetailModalType과 VoucherListType의 타입이 같음!
// api 연동 시 변경!

export type InvoiceStatus = 'ALL' | 'UNPAID' | 'PENDING' | 'PAID';

export type InvoiceListRes = Schema<'InvoiceListRes'>;

export interface InvoiceQueryParams {
  status: string;
  page: number;
  size: number;
}
