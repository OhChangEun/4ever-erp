import { transformBomDataToTree, type BomApiNode, type TreeNode } from './bomTreeUtils';
import type { BomLevelStructureNode } from '../types/BomDetailApiType';

export interface BomTreeResult {
  treeData: TreeNode | null;
  error: string | null;
}

/**
 * BOM 레벨 구조를 D3 트리로 바꾼다. 순수 함수라 렌더 중에 useMemo 로 계산한다.
 * 예전엔 effect 안에서 변환하고 결과와 로딩, 오류를 state 에 넣었다(R02). 변환은 동기라 로딩이 없다.
 */
export function buildBomTree(bomData: readonly BomLevelStructureNode[]): BomTreeResult {
  if (bomData.length === 0) return { treeData: null, error: null };
  try {
    const nodes: BomApiNode[] = bomData.map((node) => ({
      id: node.id,
      code: node.code,
      name: node.name,
      quantity: node.quantity || undefined,
      unit: node.unit || undefined,
      level: node.level,
      parentId: node.parentId || undefined,
      unitCost: node.unitCost,
    }));
    const treeData = transformBomDataToTree(nodes);
    if (!treeData) return { treeData: null, error: 'BOM 데이터를 트리 구조로 변환할 수 없습니다.' };
    return { treeData, error: null };
  } catch {
    return { treeData: null, error: 'BOM 데이터를 처리하는데 실패했습니다.' };
  }
}
