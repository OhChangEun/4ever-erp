import type salesKo from '@/i18n/messages/sales/ko.json';
import { type QuoteStatus } from '@/app/(private)/sales/types/SalesQuoteListType';
import { type OrderStatus } from '@/app/(private)/sales/types/SalesOrderListType';
import { type CustomerStatus } from '@/app/(private)/sales/types/SalesCustomerListType';

// 글자는 메시지에 있다. 여기는 코드와 순서만(i18n 8). 화면이 sales.<목록>.<묶음>.<코드> 로 번역한다

type QuoteSearchType = keyof typeof salesKo.quoteList.searchType;
type OrderSearchType = keyof typeof salesKo.orderList.searchType;

// 고객사 계정은 고객명, 담당자로 찾지 않는다
const CUSTOMER_HIDDEN_SEARCH_TYPES: Record<string, readonly string[]> = {
  CUSTOMER_ADMIN: ['customerName', 'managerName'],
};

// 견적 검색 기준. 글자는 sales.quoteList.searchType.<코드>
export const getQuoteSearchKeywordOptions = (role: string): QuoteSearchType[] => {
  const options: QuoteSearchType[] = ['quotationNumber', 'customerName', 'managerName'];
  const removeKeys = CUSTOMER_HIDDEN_SEARCH_TYPES[role] ?? [];
  return options.filter((option) => !removeKeys.includes(option));
};

// 주문 검색 기준. 글자는 sales.orderList.searchType.<코드>
export const getOrderSearchKeywordOptions = (role: string): OrderSearchType[] => {
  const options: OrderSearchType[] = ['salesOrderNumber', 'customerName', 'managerName'];
  const removeKeys = CUSTOMER_HIDDEN_SEARCH_TYPES[role] ?? [];
  return options.filter((option) => !removeKeys.includes(option));
};

// 고객 검색 기준. 글자는 sales.customerList.searchType.<코드>
export const CUSTOMER_SEARCH_KEYWORD_OPTIONS = [
  'customerName',
  'managerName',
  'customerNumber',
] as const satisfies readonly (keyof typeof salesKo.customerList.searchType)[];

// 견적 상태 필터. 글자는 sales.quoteList.statusFilter.<코드>
export const QUOTE_STATUS_OPTIONS = [
  'ALL',
  'PENDING',
  'REVIEW',
  'APPROVED',
  'REJECTED',
] as const satisfies readonly (QuoteStatus & keyof typeof salesKo.quoteList.statusFilter)[];

// 주문 상태 필터. 글자는 sales.orderList.statusFilter.<코드>
export const ORDER_STATUS_OPTIONS = [
  'ALL',
  'IN_PRODUCTION',
  'READY_FOR_SHIPMENT',
  'MATERIAL_PREPARATION',
  'DELIVERING',
  'DELIVERED',
] as const satisfies readonly (OrderStatus & keyof typeof salesKo.orderList.statusFilter)[];

// 고객 상태 필터. 글자는 sales.customerList.statusFilter.<코드>
export const CUSTOMER_STATUS_OPTIONS = [
  'ALL',
  'ACTIVE',
  'INACTIVE',
] as const satisfies readonly (CustomerStatus & keyof typeof salesKo.customerList.statusFilter)[];

// 견적서 신규 등록용 제품 표 머리. 글자는 sales.newQuote.columns.<키>
export const NEW_QUOTE_PRODUCT_TABLE_HEADERS = [
  'product',
  'spec',
  'quantity',
  'unitPrice',
  'amount',
  'action',
] as const satisfies readonly (keyof typeof salesKo.newQuote.columns)[];

// 견적서 상세, 주문 상세 모달의 품목 표 머리. 글자는 sales.common.itemColumns.<키>
export const ITEM_TABLE_HEADERS = [
  'itemName',
  'quantity',
  'unit',
  'unitPrice',
  'amount',
] as const satisfies readonly (keyof typeof salesKo.common.itemColumns)[];

// 견적 검토 모달 재고 표 머리. 글자는 sales.quoteReview.columns.<키>
export const INVENTORY_NEED_TABLE_HEADERS = [
  'itemName',
  'required',
  'current',
  'status',
] as const satisfies readonly (keyof typeof salesKo.quoteReview.columns)[];
