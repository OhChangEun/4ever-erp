import type financeKo from '@/i18n/messages/finance/ko.json';
import { type InvoiceStatus } from './types/InvoiceListType';

// 글자는 메시지(finance.invoiceList.statusFilter, finance.invoiceDetail.columns)에 있다. 여기는 코드와 순서만

// 전표 상태 필터링. 글자는 invoiceList.statusFilter.<상태>
export const VOUCHER_STATUS_OPTIONS: readonly InvoiceStatus[] = [
  'ALL',
  'UNPAID',
  'PENDING',
  'PAID',
];

// 전표 리스트 테이블 헤더. 글자는 invoiceList.columns.<키>
export const VOUCHER_LIST_TABLE_HEADERS = [
  'invoiceNumber',
  'connection',
  'totalAmount',
  'issueDate',
  'dueDate',
  'statusCode',
  'referenceNumber',
  'action',
] as const satisfies readonly (keyof typeof financeKo.invoiceList.columns)[];

// 전표 상세 모달 테이블 헤더. 글자는 invoiceDetail.columns.<키> -----------------------
export const VOUCHER_DETAIL_TABLE_HEADERS = [
  'itemName',
  'quantity',
  'unit',
  'unitPrice',
  'totalPrice',
] as const satisfies readonly (keyof typeof financeKo.invoiceDetail.columns)[];
