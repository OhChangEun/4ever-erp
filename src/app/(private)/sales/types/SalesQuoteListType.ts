import type { QueryOf, Schema } from '@/lib/api/contract';
// 승인은 게이트웨이 enum 이 APPROVAL(QuotationStatus.java:13), 승인 API 설명이 APPROVED(SdController.java:392)다.
// 어느 쪽이 오는지 사본으로 확정 못 해 둘 다 받는다(decisions.md 2026-11-11)
export type QuoteStatus = 'ALL' | 'APPROVED' | 'APPROVAL' | 'REVIEW' | 'PENDING' | 'REJECTED';

// 목록 필터로 보내는 값. 계약 GET /business/sd/quotations 의 status enum 에서 온다(게이트웨이 SdController.java:101).
// 받는 쪽(QuoteStatus)과 달리 APPROVED 는 없다. 계약 값이 바뀌면 선택지가 tsc 에서 걸린다
export type QuoteStatusFilter = NonNullable<QueryOf<'/business/sd/quotations'>['status']>;

export interface QuoteItem {
  product: string;
  specification: string;
  quantity: number;
  unitPrice: number;
}

export type Quote = Schema<'Quote'>;

export interface QuoteFormItem {
  id: number;
  product: string;
  specification: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface QuoteFormData {
  customer: string;
  customerContact: string;
  customerEmail: string;
  quoteDate: string;
  validUntil: string;
  items: QuoteFormItem[];
  totalAmount: number;
  notes: string;
  paymentTerms: string;
  deliveryTerms: string;
  warranty: string;
}

export interface QuoteQueryParams {
  startDate?: string;
  endDate?: string;
  status?: QuoteStatusFilter;
  type?: string;
  keyword?: string;
  sort?: string;
  page?: number;
  size?: number;
}
