'use client';

import WarehouseVisualizer from '@/app/(private)/warehouse/components/warehouseVisualizer/components/WarehouseVisualizer';
import type { Warehouse3DModalProps } from '../WarehouseVisualizerType';

/**
 * 창고 3D 모달 내용. 틀은 공통 모달(ModalProvider, Radix Dialog)이 맡는다.
 * 예전엔 직접 만든 오버레이라 Esc 로 닫히지 않고 포커스가 뒤 화면으로 빠졌다(시각화 8 에서 발견).
 */
const Warehouse3DModal = ({ warehouseId, warehouseName }: Warehouse3DModalProps) => (
  <WarehouseVisualizer warehouseId={warehouseId} warehouseName={warehouseName} height={440} />
);

export default Warehouse3DModal;
