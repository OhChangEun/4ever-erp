import type { Schema } from '@/lib/api/contract';

// 요청과 응답 모양은 OpenAPI 계약이 원본이다(openapi/everp.yaml)
export type AddWarehouseRequest = Schema<'AddWarehouseRequest'>;

export type WarehouseManagerInfoResponse = Schema<'WarehouseManager'>;
