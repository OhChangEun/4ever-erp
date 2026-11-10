import type purchaseKo from '@/i18n/messages/purchase/ko.json';

// 헤더는 메시지 키. 글자는 모달이 그릴 때 바꾼다
type RequestFormColumn = keyof typeof purchaseKo.requestForm.columns;
type RequestDetailColumn = keyof typeof purchaseKo.requestDetail.columns;

// 구매 요청 모달 입력 테이블 헤더. null 은 삭제 버튼 칸(제목 없음)
export const PURCHASE_REQUEST_TABLE_HEADERS: readonly (RequestFormColumn | null)[] = [
  'itemName',
  'quantity',
  'unit',
  'expectedUnitPrice',
  'expectedTotal',
  'preferredSupplier',
  'dueDate',
  'purpose',
  'note',
  null,
];

// 구매 상세 정보 모달 테이블 헤더
export const PURCHASE_ITEM_TABLE_HEADERS: readonly RequestDetailColumn[] = [
  'itemName',
  'quantity',
  'unit',
  'unitPrice',
  'amount',
  'dueDate',
];
