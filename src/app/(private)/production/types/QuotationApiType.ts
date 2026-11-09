import type { Schema } from '@/lib/api/contract';
import { PageRequest } from '@/app/types/Page';
import { DateRequest } from '@/app/types/Date';

export type itemsData = Schema<'itemsData'>;

export type QuotationData = Schema<'QuotationData'>;

// 견적 관리 리스트 최상위 응답 타입
export type QuotationListResponse = Schema<'QuotationListResponse'>;

// 응답 요청시 request params
export interface FetchQuotationParams extends DateRequest, PageRequest {
  availableStatusCode: string;
}
