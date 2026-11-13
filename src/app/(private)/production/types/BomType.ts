import type { Schema } from '@/lib/api/contract';
// types/BomType.ts

// bom 생성 시 body
export type BomRequestBody = Schema<'BomRequestBody'>;

// bom 자재 목록 자동 load
export type MaterialResponse = Schema<'MaterialResponse'>;
