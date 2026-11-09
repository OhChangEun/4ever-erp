import type { Schema } from '@/lib/api/contract';
// BOM 구성품 (Component)
export type BomComponent = Schema<'BomComponent'>;

// BOM 레벨 구조 노드 (새로운 트리 구조)
export type BomLevelStructureNode = Schema<'BomLevelStructureNode'>;

// 공정(Routing) 정보
export type BomRouting = Schema<'BomRouting'>;

// BOM 전체 정보
export type BomDetailResponse = Schema<'BomDetailResponse'>;
