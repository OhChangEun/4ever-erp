'use client';

import WarehouseVisualizer from '@/app/(private)/warehouse/components/warehouseVisualizer/components/WarehouseVisualizer';
import { Warehouse3DModalProps } from '../WarehouseVisualizerType';

const Warehouse3DModal = ({ warehouseId, warehouseName, onClose }: Warehouse3DModalProps) => {
  return (
    <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="relative w-full max-w-7xl rounded-2xl bg-white shadow-xl p-2">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-600 cursor-pointer"
            aria-label="닫기"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="px-6 pb-6">
          <WarehouseVisualizer
            warehouseId={warehouseId}
            warehouseName={warehouseName}
            height={440}
          />
        </div>
      </div>
    </div>
  );
};

export default Warehouse3DModal;
