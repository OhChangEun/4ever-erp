import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';

// 시뮬레이션 정보
export type SimulationData = Schema<'SimulationData'>;

// 시뮬레이션 후 응답 데이터
export type QuotationSimulationData = Schema<'QuotationSimulationData'>;

// 견적 시뮬레이션 결과 최상위 응답 타입
export type QuotationSimulationResponse = Schema<'QuotationSimulationResponse'>;

// 요청 params
export interface FetchQuotationSimulationParams extends PageRequest {
  quotationIds: string[];
}
