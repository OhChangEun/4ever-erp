import { PageRequest } from '@/app/types/Page';

export interface WeekData {
  week: string;
  demand: number;
  requiredQuantity: number;
  productionQuantity: number;
  mps: number;
}

// 제안 납기 계획 프리뷰 데이터
export interface QuotationPreviewData {
  quotationNumber: string;
  customerCompanyName: string;
  productName: string;
  confirmedDueDate: string;
  weeks: WeekData[];
}

// 제안 납기 계획 프리뷰 결과 최상위 응답 타입
export type QuotationPreviewResponse = QuotationPreviewData[];

// 응답 요청시 request params
export interface FetchQuotationPreviewParams extends PageRequest {
  quotationIds: string[];
}
