import { InventoryResponse } from '@/app/(private)/inventory/types/InventoryListType';
import { InventoryQueryParamForWarehouse } from './useWarehouseClusters';

export type ViewMode = 'overview' | 'warehouse';

export interface WarehouseVisualizerProps {
  warehouseId?: string;
  warehouseName?: string;
  height?: number;
  hideSummary?: boolean;
}

export interface WarehouseFilter {
  warehouseId?: string;
  warehouseName?: string;
}

export interface VisualizerItem extends InventoryResponse {
  warehouseKey: string;
  localPosition: [number, number, number];
  level: number;
  fillRatio: number;
  isLowStock: boolean;
}

export interface WarehouseCluster {
  key: string;
  name: string;
  origin: [number, number, number];
  items: VisualizerItem[];
}

export const DEFAULT_QUERY: InventoryQueryParamForWarehouse = {
  page: 0,
  size: 80,
  statusCode: 'ALL',
  category: '',
  warehouse: '',
  itemName: '',
};

export interface Warehouse3DModalProps {
  warehouseId: string;
  warehouseName: string;
  onClose: () => void;
}

export interface SceneProps {
  clusters: WarehouseCluster[];
  viewMode: ViewMode;
  activeWarehouseKey: string | null;
  selectedItemId: string | null;
  onSelectWarehouse: (key: string) => void;
  onSelectItem: (item: VisualizerItem) => void;
}
