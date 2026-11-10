import type { TreeNode } from './bomTreeUtils';

export interface NodeCost {
  /** 노드 1단위 원가. 자재는 단가, 상위는 하위 합계. 아는 것이 하나도 없으면 null */
  unitCost: number | null;
  /** 완제품 1개에 대한 기여(경로의 수량 곱 × 1단위 원가) */
  contribution: number | null;
  /** 완제품 원가 대비 비중(정수 %) */
  share: number | null;
  /** 이 노드가 단가 없는 자재다 */
  missing: boolean;
  /** 아래에 단가 없는 자재가 있어 unitCost 가 아는 것만의 합이다("이상") */
  partial: boolean;
}

const qtyOf = (n: TreeNode) => n.quantity ?? 1;

/**
 * BOM 원가 롤업(시각화 7). 단가 없는 자재를 0 원으로 세지 않는다(우선순위 2).
 * 그런 자재가 아래에 있으면 위 노드는 partial 이고, 화면은 "이상"이라고 쓴다.
 */
export const rollupBomCost = (root: TreeNode) => {
  const byId = new Map<string, NodeCost>();

  const unit = (n: TreeNode): { cost: number | null; partial: boolean } => {
    const children = n.children ?? [];
    if (children.length === 0) {
      const cost = typeof n.unitCost === 'number' ? n.unitCost : null;
      byId.set(n.id, {
        unitCost: cost,
        contribution: null,
        share: null,
        missing: cost === null,
        partial: false,
      });
      return { cost, partial: false };
    }
    let sum = 0;
    let known = 0;
    let partial = false;
    for (const c of children) {
      const r = unit(c);
      if (r.cost === null) partial = true;
      else {
        sum += qtyOf(c) * r.cost;
        known += 1;
      }
      if (r.partial) partial = true;
    }
    const cost = known > 0 ? sum : null;
    byId.set(n.id, { unitCost: cost, contribution: null, share: null, missing: false, partial });
    return { cost, partial };
  };

  const total = unit(root).cost;

  // 완제품 1개 기준 기여와 비중. 루트의 수량은 1 로 본다
  const walk = (n: TreeNode, multiplier: number) => {
    const entry = byId.get(n.id);
    if (entry) {
      entry.contribution = entry.unitCost === null ? null : multiplier * entry.unitCost;
      entry.share =
        entry.contribution === null || !total
          ? null
          : Math.round((entry.contribution / total) * 100);
    }
    for (const c of n.children ?? []) walk(c, multiplier * qtyOf(c));
  };
  walk(root, 1);

  const leaves: TreeNode[] = [];
  const collect = (n: TreeNode) => {
    if (!n.children?.length) leaves.push(n);
    for (const c of n.children ?? []) collect(c);
  };
  collect(root);

  const materials = leaves
    .map((n) => ({ id: n.id, name: n.name, contribution: byId.get(n.id)?.contribution ?? null }))
    .filter((m): m is { id: string; name: string; contribution: number } => m.contribution !== null)
    .sort((a, b) => b.contribution - a.contribution);

  return {
    byId,
    total,
    partial: byId.get(root.id)?.partial ?? false,
    materials,
    missingCount: leaves.filter((n) => byId.get(n.id)?.missing).length,
  };
};
