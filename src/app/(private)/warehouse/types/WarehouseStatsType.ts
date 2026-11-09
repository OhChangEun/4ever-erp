import type { Schema } from '@/lib/api/contract';

// 응답 모양은 OpenAPI 계약이 원본이다(openapi/everp.yaml)
export type WarehouseStatResponse = Schema<'WarehouseStats'>;
