// BOM 데이터를 트리 구조로 변환하는 유틸리티

export interface BomApiNode {
  id: string;
  code: string;
  name: string;
  quantity?: number;
  unit?: string;
  level: number;
  parentId?: string;
  /** 자재 1단위 단가(원). 상위는 bomCost 가 계산한다(시각화 7) */
  unitCost?: number | null;
  children?: BomApiNode[];
}

export interface TreeNode {
  id: string;
  name: string;
  code: string;
  quantity?: number;
  unit?: string;
  level: number;
  unitCost?: number | null;
  children?: TreeNode[];
}

/**
 * 백엔드 BOM 데이터를 D3 트리 구조로 변환
 * @param bomData 백엔드에서 받아온 BOM 데이터
 * @returns D3TreeChart에서 사용할 수 있는 트리 구조
 */
export function transformBomDataToTree(bomData: BomApiNode[]): TreeNode | null {
  if (!bomData || bomData.length === 0) return null;

  // 1. 루트 노드 찾기 (level이 0이거나 parentId가 null/undefined인 노드)
  const rootNode = bomData.find(
    (node) => node.level === 0 || !node.parentId || node.parentId === null,
  );
  if (!rootNode) return null;

  // 2. 재귀적으로 자식 노드들을 연결
  function buildTree(parentNode: BomApiNode): TreeNode {
    const children = bomData
      .filter((node) => node.parentId === parentNode.id)
      .map((child) => buildTree(child))
      .sort((a, b) => a.code.localeCompare(b.code)); // 코드 순으로 정렬

    return {
      id: parentNode.id,
      name: parentNode.name,
      code: parentNode.code,
      quantity: parentNode.quantity,
      unit: parentNode.unit,
      level: parentNode.level,
      unitCost: parentNode.unitCost,
      children: children.length > 0 ? children : undefined,
    };
  }

  return buildTree(rootNode);
}
