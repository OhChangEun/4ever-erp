import { useMemo } from 'react';
import { DEFAULT_QUERY, WarehouseFilter } from './WarehouseVisualizerType';
import { useQuery } from '@tanstack/react-query';
import { getInventoryList } from '@/app/(private)/inventory/inventory.api';
import { buildCluster, SAMPLE_INVENTORY } from './clusters';
import { InventoryQueryParams } from '@/app/(private)/inventory/types/InventoryListType';
import { warehouseVisualizerKeys } from '@/app/(private)/warehouse/warehouse.keys';

export interface InventoryQueryParamForWarehouse {
  statusCode?: string;
  page?: number;
  size?: number;
  category?: string;
  warehouse?: string;
  itemName: string;
}

const createQueryParams = (filter?: WarehouseFilter): InventoryQueryParamForWarehouse => {
  return {
    page: 0,
    size: filter?.warehouseId ? 120 : DEFAULT_QUERY.size,
    statusCode: DEFAULT_QUERY.statusCode,
    category: DEFAULT_QUERY.category,
    warehouse: filter?.warehouseId ?? '',
    itemName: DEFAULT_QUERY.itemName,
  };
};

export const useWarehouseClusters = (filter?: WarehouseFilter) => {
  const queryParams = useMemo(() => createQueryParams(filter), [filter?.warehouseId]);
  const { data } = useQuery({
    queryKey: warehouseVisualizerKeys.list(queryParams),
    queryFn: () => getInventoryList(queryParams),
    staleTime: 1000 * 60,
  });

  const source = useMemo(() => {
    const payload = data?.data;
    // if (payload && payload.length) return payload;
    // if (filter?.warehouseId) {
    //   const fallback = SAMPLE_INVENTORY.filter((item) =>
    //     filter.warehouseName ? item.warehouseName === filter.warehouseName : true,
    //   );
    //   return fallback.length ? fallback : SAMPLE_INVENTORY;
    // }
    return SAMPLE_INVENTORY;
  }, [SAMPLE_INVENTORY]);

  return useMemo(
    () => buildCluster(source, filter),
    [source, filter?.warehouseId, filter?.warehouseName],
  );
};
