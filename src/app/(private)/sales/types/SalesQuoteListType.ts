import type { Schema } from '@/lib/api/contract';
export type QuoteStatus = 'ALL' | 'APPROVED' | 'REVIEW' | 'PENDING' | 'REJECTED';

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
  status?: string;
  type?: string;
  keyword?: string;
  sort?: string;
  page?: number;
  size?: number;
}
