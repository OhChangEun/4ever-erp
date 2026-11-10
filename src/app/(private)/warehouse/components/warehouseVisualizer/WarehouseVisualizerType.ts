import type { ModalProps } from '@/app/components/common/modal/types';
import type { InventoryResponse } from '@/app/(private)/inventory';
import type { StockBand } from './stockHeat';

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
  level: number;
  /** 블록 자리(0부터, 선반 번호 순서). 장면이 랙, 층, 칸을 여기서 계산한다 */
  slot: number;
  fillRatio: number;
  isLowStock: boolean;
  band: StockBand;
}

export interface WarehouseCluster {
  key: string;
  /** null 이면 이름 없는 창고. 글자는 화면이 붙인다(계산은 한국어를 돌려주지 않는다) */
  name: string | null;
  origin: [number, number, number];
  items: VisualizerItem[];
}

export interface Warehouse3DModalProps extends ModalProps {
  warehouseId: string;
  warehouseName: string;
}

export interface SceneProps {
  clusters: WarehouseCluster[];
  viewMode: ViewMode;
  activeWarehouseKey: string | null;
  selectedItemId: string | null;
  onSelectWarehouse: (key: string) => void;
  onSelectItem: (item: VisualizerItem) => void;
}
