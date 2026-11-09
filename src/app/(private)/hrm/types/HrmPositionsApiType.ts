import type { Schema } from '@/lib/api/contract';
// 직급 데이터 형식
export type PositionData = Schema<'PositionData'>;

export type PositionDataResponse = PositionData[];

export type EmployeeSummary = Schema<'EmployeeSummary'>;

export type PositionDetailResponse = Schema<'PositionDetailResponse'>;
