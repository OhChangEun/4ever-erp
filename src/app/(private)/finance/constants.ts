import { type KeyValueItem } from '@/app/types/CommonType';
import { type InvoiceStatus } from './types/InvoiceListType';

// 전표 상태 필터링
export const VOUCHER_STATUS_OPTIONS: KeyValueItem<InvoiceStatus>[] = [
  { key: 'ALL', value: '전체 상태' },
  { key: 'UNPAID', value: '미납' },
  { key: 'PENDING', value: '확인대기' },
  { key: 'PAID', value: '완납' },
] as const;

// 전표 리스트 테이블 헤더
export const VOUCHER_LIST_TABLE_HEADERS = [
  '전표번호',
  '거래처',
  '금액',
  '전표 발생일',
  '만기일',
  '상태',
  '참조번호',
  '작업',
] as const;

// 전표 상세 모달 테이블 헤더 -----------------------
export const VOUCHER_DETAIL_TABLE_HEADERS = ['품목', '수량', '단위', '단가', '금액'] as const;
