import { type KeyValueItem } from '@/app/types/CommonType';
import { type QuoteStatus } from '@/app/(private)/sales/types/SalesQuoteListType';
import { type OrderStatus } from '@/app/(private)/sales/types/SalesOrderListType';
import { type CustomerStatus } from '@/app/(private)/sales/types/SalesCustomerListType';

// 견적 검색 키워드 옵션
export const getQuoteSearchKeywordOptions = (role: string) => {
  const options: KeyValueItem<string>[] = [
    { key: 'quotationNumber', value: '견적번호' },
    { key: 'customerName', value: '고객명' },
    { key: 'managerName', value: '담당자' },
  ];

  const keysToRemove: Record<string, string[]> = {
    CUSTOMER_ADMIN: ['customerName', 'managerName'],
  };
  const removeKeys = keysToRemove[role] ?? [];

  return options.filter((option) => !removeKeys.includes(option.key));
};

// 견적 검색 키워드 옵션
export const getOrderSearchKeywordOptions = (role: string) => {
  const options: KeyValueItem<string>[] = [
    { key: 'salesOrderNumber', value: '주문번호' },
    { key: 'customerName', value: '고객명' },
    { key: 'managerName', value: '담당자' },
  ];

  const keysToRemove: Record<string, string[]> = {
    CUSTOMER_ADMIN: ['customerName', 'managerName'],
  };
  const removeKeys = keysToRemove[role] ?? [];

  return options.filter((option) => !removeKeys.includes(option.key));
};

// 고객 검색 키워드 옵션
export const CUSTOMER_SEARCH_KEYWORD_OPTIONS: KeyValueItem<string>[] = [
  { key: 'customerName', value: '고객명' },
  { key: 'managerName', value: '담당자' },
  { key: 'customerNumber', value: '고객코드' },
] as const;

// 견적 상태 필터링
export const QUOTE_STATUS_OPTIONS: KeyValueItem<QuoteStatus>[] = [
  { key: 'ALL', value: '전체 상태' },
  { key: 'PENDING', value: '대기' },
  { key: 'REVIEW', value: '검토' },
  { key: 'APPROVED', value: '승인' },
  { key: 'REJECTED', value: '반려' },
] as const;

// 주문 상태 필터링
export const ORDER_STATUS_OPTIONS: KeyValueItem<OrderStatus>[] = [
  { key: 'ALL', value: '전체 상태' },
  { key: 'IN_PRODUCTION', value: '생산중' },
  { key: 'READY_FOR_SHIPMENT', value: '출하 준비 완료' },
  { key: 'MATERIAL_PREPARATION', value: '자재 준비중' },
  { key: 'DELIVERING', value: '배송중' },
  { key: 'DELIVERED', value: '배송완료' },
] as const;

// 고객 상태 필터링
export const CUSTOMER_STATUS_OPTIONS: KeyValueItem<CustomerStatus>[] = [
  { key: 'ALL', value: '전체' },
  { key: 'ACTIVE', value: '활성' },
  { key: 'DEACTIVE', value: '비활성' },
] as const;

// 견적 관리 테이블 헤더
export const QUOTE_LIST_TABLE_HEADERS = [
  '선택',
  '견적번호',
  '고객명',
  '담당자',
  '견적일자',
  '납기일',
  '견적금액',
  '상태',
  '작업',
] as const;

// 주문 관리 테이블 헤더
export const ORDER_LIST_TABLE_HEADERS = [
  '주문번호',
  '고객정보',
  '주문일',
  '납기일',
  '주문금액',
  '상태',
  '작업',
] as const;

// 고객 관리 테이블 헤더
export const CUSTOMER_LIST_TABLE_HEADERS = [
  '고객정보',
  '연락처',
  '주소',
  '거래실적',
  '상태',
  '작업',
] as const;

// 견적서 신규 등록용 제품 테이블 헤더
export const NEW_QUOTE_PRODUCT_TABLE_HEADERS = [
  '제품명',
  '사양',
  '수량',
  '단가',
  '금액',
  '작업',
] as const;

// 견적서 상세 모달 테이블 헤더
export const QUOTE_DETAIL_TABLE_HEADERS = ['제품명', '수량', '단위', '단가', '금액'] as const;

// 견적 요청 모달 재고 부족 테이블 헤더
export const INVENTORY_NEED_TABLE_HEADERS = ['제품명', '필요 수량', '현재 재고', '상태'] as const;

// 주문 상세 모달 테이블 헤더
export const ORDER_DETAIL_TABLE_HEADERS = ['제품명', '수량', '단위', '단가', '금액'] as const;
