import { useMemo } from 'react';
import { WarehouseFilter } from './WarehouseVisualizerType';
import { buildCluster, SAMPLE_INVENTORY } from './clusters';

/** 창고 3D 뷰가 쓸 재고 목록 요청 파라미터. 실데이터 연결은 시각화 블록 카드에서. */
export interface InventoryQueryParamForWarehouse {
  statusCode?: string;
  page?: number;
  size?: number;
  category?: string;
  warehouse?: string;
  itemName: string;
}

/**
 * 창고 클러스터. 지금은 SAMPLE_INVENTORY 만 쓴다.
 * 2026-11-09 전까지는 재고 목록을 요청해 놓고 결과를 버렸다(린트 1차에서 요청 제거).
 * 실데이터로 바꾸는 건 시각화 블록 "창고 3D 재고 heat" 카드.
 */
export const useWarehouseClusters = (filter?: WarehouseFilter) =>
  useMemo(
    () => buildCluster(SAMPLE_INVENTORY, filter),
    [filter?.warehouseId, filter?.warehouseName],
  );
