import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryKeys, type InventoryQueryParams } from '@/app/(private)/inventory';
// api 함수는 무거운 입구(ui.ts)에서. 이 훅은 3D 모달(동적 청크) 안에서만 쓰인다
import { getInventoryList } from '@/app/(private)/inventory/ui';
import type { WarehouseFilter } from './WarehouseVisualizerType';
import { buildCluster, MAX_SLOTS } from './clusters';

/**
 * 창고 하나의 실제 재고(시각화 8). 재고 목록 API 를 창고 이름으로 거른다.
 * 키는 재고 도메인의 목록 키라 재고 mutation 이 목록을 무효화하면 3D 도 다시 받는다(우선순위 1).
 */
export const useWarehouseClusters = (filter?: WarehouseFilter) => {
  const params: InventoryQueryParams = {
    type: 'WAREHOUSE_NAME',
    keyword: filter?.warehouseName ?? '',
    page: 0,
    size: MAX_SLOTS,
  };
  const query = useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () => getInventoryList(params),
    enabled: !!filter?.warehouseName,
  });
  const data = query.data;
  const clusters = useMemo(() => buildCluster(data?.data ?? [], filter), [data, filter]);
  return {
    clusters,
    total: data?.pageData.totalElements ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};
