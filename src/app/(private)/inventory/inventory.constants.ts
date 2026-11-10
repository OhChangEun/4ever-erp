import { type KeyValueItem } from '@/app/types/CommonType';

export const SHIPPING_TABLE_HEADERS = [
  '주문 번호',
  '고객 정보',
  '주문일',
  '납기일',
  '주문 금액',
  '상태',
  '작업',
] as const;

export const RECEIVING_PENDING_TABLE_HEADERS = [
  '발주서 번호',
  '공급업체',
  '주문일',
  '납기일',
  '주문 금액',
  '상태',
] as const;

export const RECEIVING_COMPLETED_TABLE_HEADERS = [
  '발주서 번호',
  '공급업체',
  '주문일',
  '입고 완료일',
  '주문 금액',
  '상태',
] as const;

export const INVENTORY_TABLE_HEADERS = [
  '품목',
  '카테고리',
  '현재재고',
  '예약',
  '출고대기',
  '안전재고',
  '단가',
  '총 가치',
  '창고 위치',
  '상태',
  '작업',
] as const;

export const INVENTORY_SEARCH_KEYWORD_OPTIONS: KeyValueItem<string>[] = [
  { key: 'WAREHOUSE_NAME', value: '창고명' },
  { key: 'ITEM_NAME', value: '품목명' },
] as const;

export const INVENTORY_STATUS_OPTIONS: KeyValueItem<string>[] = [
  { key: 'ALL', value: '전체' },
  { key: 'NORMAL', value: '정상' },
  { key: 'CAUTION', value: '주의' },
  { key: 'URGENT', value: '긴급' },
] as const;

export const LOW_STOCK_STATUS_OPTIONS: KeyValueItem<string>[] = [
  { key: 'ALL', value: '전체' },
  { key: 'CAUTION', value: '주의' },
  { key: 'URGENT', value: '긴급' },
] as const;
