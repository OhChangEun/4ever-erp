// 구매 요청 모달 입력 테이블 헤더
export const PURCHASE_REQUEST_TABLE_HEADERS = [
  '품목명',
  '수량',
  '단위',
  '예상 단가',
  '예상 총액',
  '희망 공급업체',
  '희망 납기일',
  '사용 목적',
  '비고',
  '',
] as const;

// 구매 상세 정보 모달 테이블 헤더
export const PURCHASE_ITEM_TABLE_HEADERS = [
  '품목명',
  '수량',
  '단위',
  '단가',
  '금액',
  '납기일',
] as const;
