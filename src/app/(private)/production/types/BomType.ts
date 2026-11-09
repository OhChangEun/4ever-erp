import type { Schema } from '@/lib/api/contract';
// types/BomType.ts

export type BomStatus = '활성' | '비활성';
export type ComponentType = '부품' | '원자재' | '';
export type ComponentLevel = 1 | 2 | 3;

export interface Component {
  id: string;
  code: string;
  type: ComponentType;
  name: string;
  quantity: number;
  unit: string;
  level: ComponentLevel;
  material: string;
  supplier: string;
}

export interface Process {
  id: string;
  sequence: number;
  name: string;
  workCenter: string;
  setupTime: number;
  runTime: number;
}

export type ItemData = Schema<'ItemData'>;

export type ComponentRow = Component;

export type MaterialSupplierMap = Record<string, string[]>;
export type SupplierProcessMap = Record<string, string[]>;

// bom 생성 시 body
export type BomRequestBody = Schema<'BomRequestBody'>;

// bom 자재 목록 자동 load
export type MaterialResponse = Schema<'MaterialResponse'>;
