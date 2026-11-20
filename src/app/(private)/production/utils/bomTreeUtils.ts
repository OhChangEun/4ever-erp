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

/** BOM 상세 응답의 평탄한 행을 형제 품목 코드 순서의 트리로 연결한다. */
export function transformBomDataToTree(bomData: BomApiNode[]): TreeNode | null {
  if (bomData.length === 0) return null;

  // 1. 루트 노드 찾기 (level이 0이거나 parentId가 null/undefined인 노드)
  const rootNode = bomData.find((node) => node.level === 0 || !node.parentId);
  if (!rootNode) return null;

  const childrenByParent = new Map<string, BomApiNode[]>();
  for (const node of bomData) {
    if (node.parentId === undefined) continue;
    const siblings = childrenByParent.get(node.parentId);
    if (siblings) siblings.push(node);
    else childrenByParent.set(node.parentId, [node]);
  }

  function buildTree(parentNode: BomApiNode): TreeNode {
    const children = (childrenByParent.get(parentNode.id) ?? [])
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
