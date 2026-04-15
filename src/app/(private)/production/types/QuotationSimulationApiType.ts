import { Page, PageRequest } from '@/app/types/Page';

// 시뮬레이션 정보
export interface SimulationData {
  status: string;
  availableQuantity: number;
  shortageQuantity: number;
  shortageReason?: string;
  suggestedDueDate: string;
  generatedAt: string;
}

// 시뮬레이션 후 응답 데이터
export interface QuotationSimulationData {
  quotationId: string;
  quotationNumber: string;
  customerCompanyId: string;
  customerCompanyName: string;
  productId: string;
  productName: string;
  requestQuantity: number;
  requestDueDate: number;
  simulation: SimulationData;
}

// 견적 시뮬레이션 결과 최상위 응답 타입
export interface QuotationSimulationResponse {
  page: Page;
  content: QuotationSimulationData[];
}

// 요청 params
export interface FetchQuotationSimulationParams extends PageRequest {
  quotationIds: string[];
}
