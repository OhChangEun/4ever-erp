import type { InventoryResponse } from '@/app/(private)/inventory';
import { VisualizerItem, WarehouseCluster, WarehouseFilter } from './WarehouseVisualizerType';
import { stockBand } from './stockHeat';

/** 랙 4개 × 칸 15. 이보다 많은 품목은 그리지 않는다(시각화 8 결정 2) */
export const MAX_SLOTS = 60;

export const buildCluster = (
  source: InventoryResponse[],
  options?: WarehouseFilter,
): WarehouseCluster[] => {
  if (source.length === 0) {
    return [
      {
        key: options?.warehouseId ?? 'no-data',
        name: options?.warehouseName ?? '미지정 창고',
        origin: [0, 0, 0],
        items: [],
      },
    ];
  }

  const displayName = options?.warehouseName ?? source[0].warehouseName ?? '미지정 창고';
  const clusterKey = options?.warehouseId ?? displayName;

  // 블록 자리는 선반 번호 순서로 0번부터 채운다. 서버 선반 번호가 겹쳐도 블록이 겹치지 않는다
  const ordered = [...source]
    .sort((a, b) => (a.shelfNumber ?? 0) - (b.shelfNumber ?? 0))
    .slice(0, MAX_SLOTS);
  const items: VisualizerItem[] = ordered.map((item, slot) => {
    const safety = item.safetyStock;
    return {
      ...item,
      warehouseKey: clusterKey,
      level: Math.floor((slot % 15) / 5),
      slot,
      fillRatio: safety > 0 ? Math.max(item.currentStock / safety, 0) : 0,
      isLowStock: safety > 0 && item.currentStock < safety,
      band: stockBand(item.currentStock, safety),
    };
  });

  return [
    {
      key: clusterKey,
      name: displayName,
      origin: [0, 0, 0],
      items,
    },
  ];
};

// 창고 재고 요약 정보 처리 로직
export const summarizeClusters = (clusters: WarehouseCluster[]) => {
  return clusters.map((cluster) => {
    const totalItems = cluster.items.length;
    const totalQty = cluster.items.reduce((acc, item) => acc + item.currentStock, 0);
    const lowStock = cluster.items.filter((item) => item.isLowStock).length;
    const avgFill =
      cluster.items.reduce((acc, item) => acc + Math.min(item.fillRatio, 1), 0) / (totalItems || 1);

    return {
      key: cluster.key,
      name: cluster.name,
      totalItems,
      totalQty,
      lowStock,
      avgFillPercent: Math.round(avgFill * 100),
    };
  });
};
