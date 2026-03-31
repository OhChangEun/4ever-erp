'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  ViewMode,
  VisualizerItem,
  WarehouseFilter,
  WarehouseVisualizerProps,
} from '../WarehouseVisualizerType';
import { summarizeClusters } from '../clusters';
import { useWarehouseClusters } from '../useWarehouseClusters';
import WarehouseScene from './WarehouseScene';
import FreeCameraControls from './FreeCameraControls';

const WarehouseVisualizer = ({
  warehouseId,
  warehouseName,
  hideSummary,
}: WarehouseVisualizerProps) => {
  const filterOptions = useMemo<WarehouseFilter | undefined>(
    () => (warehouseId ? { warehouseId, warehouseName } : undefined),
    [warehouseId, warehouseName],
  );

  const clusters = useWarehouseClusters(filterOptions);
  const [activeWarehouseKey, setActiveWarehouseKey] = useState<string | null>(
    filterOptions?.warehouseId ?? null,
  );
  const [selectedItem, setSelectedItem] = useState<VisualizerItem | null>(null);
  const [freeMode, setFreeMode] = useState(false);

  useEffect(() => {
    if (filterOptions?.warehouseId) {
      setActiveWarehouseKey(filterOptions.warehouseId);
    } else if (!filterOptions) {
      setActiveWarehouseKey((prev) =>
        prev && clusters.some((cluster) => cluster.key === prev) ? prev : null,
      );
    }
  }, [filterOptions?.warehouseId, clusters, filterOptions]);

  const activeCluster = useMemo(
    () => clusters.find((cluster) => cluster.key === activeWarehouseKey) ?? null,
    [clusters, activeWarehouseKey],
  );

  const viewMode: ViewMode = activeCluster ? 'warehouse' : 'overview';
  const allowWarehouseNavigation = !filterOptions;
  const canvasHeight = 600;

  useEffect(() => {
    if (viewMode === 'warehouse' && !selectedItem) {
      setSelectedItem(activeCluster?.items[0] ?? null);
    }

    if (viewMode === 'overview') {
      setSelectedItem(null);
    }
  }, [viewMode]);

  const summaries = useMemo(() => summarizeClusters(clusters), [clusters]);

  const handleEnterWarehouse = (key: string) => {
    setActiveWarehouseKey(key);
  };

  const handleExitWarehouse = () => {
    if (!allowWarehouseNavigation) return;
    setActiveWarehouseKey(null);
    setSelectedItem(null);
  };

  return (
    <section
      className={hideSummary ? 'grid gap-6' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">창고 3D 뷰</h2>
            <p className="text-sm text-gray-500">
              창고를 선택해 내부 선반을 확인하고, 블록을 클릭해 재고 상세 정보를 확인하세요.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <span className="inline-flex h-3 w-3 rounded-full bg-[#2563eb]" />
            정상
            <span className="inline-flex h-3 w-3 rounded-full bg-[#f59e0b]" />
            주의
            <span className="inline-flex h-3 w-3 rounded-full bg-[#ef4444]" />
            부족
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100"
          style={{ height: canvasHeight }}
        >
          {viewMode === 'warehouse' && (
            <button
              type="button"
              onClick={() => setFreeMode((prev) => !prev)}
              className="absolute right-4 bottom-4 z-local rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-gray-700 shadow hover:bg-blue-50"
            >
              {freeMode ? '마우스 탐색 종료' : '자유 시점 이동'}
            </button>
          )}
          {viewMode === 'warehouse' && activeCluster && (
            <div className="absolute left-4 top-4 z-local flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-gray-700 shadow">
              <i className="ri-home-5-line text-base text-blue-600"></i>
              <span>{activeCluster.name}</span>
            </div>
          )}

          {allowWarehouseNavigation && viewMode === 'warehouse' && (
            <button
              type="button"
              onClick={handleExitWarehouse}
              className="absolute right-4 top-4 z-local inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-blue-700 shadow transition hover:bg-blue-50"
            >
              <i className="ri-arrow-left-line text-sm"></i>
              <span>창고 목록으로</span>
            </button>
          )}

          {allowWarehouseNavigation && viewMode === 'overview' && (
            <div className="pointer-events-none absolute left-4 top-4 z-local rounded-lg bg-white/85 px-3 py-2 text-xs text-gray-600 shadow">
              창고 바닥을 더블 클릭하거나 창고 요약 카드에서 이동해 내부를 확인하세요.
            </div>
          )}

          <Canvas
            shadows
            camera={{
              position: [0, 10, -15],
              fov: 45,
              near: 0.1,
              far: 200,
            }}
          >
            <Suspense fallback={null}>
              <WarehouseScene
                clusters={clusters}
                viewMode={viewMode}
                activeWarehouseKey={activeCluster?.key ?? null}
                selectedItemId={selectedItem?.itemId ?? null}
                onSelectWarehouse={handleEnterWarehouse}
                onSelectItem={setSelectedItem}
              />
              <Environment preset="warehouse" />
            </Suspense>
            {freeMode ? (
              <FreeCameraControls />
            ) : (
              <OrbitControls
                enablePan
                minDistance={viewMode === 'warehouse' ? 6 : 12}
                maxDistance={viewMode === 'warehouse' ? 24 : 60}
                maxPolarAngle={Math.PI / 2.1}
                target={[0, 0, 0]}
              />
            )}
          </Canvas>
          {freeMode && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-overlay -translate-x-1/2 -translate-y-1/2">
              <div className="h-4 w-4 rounded-full border-2 border-blue-500 shadow-md" />
            </div>
          )}
        </div>
      </div>

      {!hideSummary && (
        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-gray-900">창고 요약</h3>
            <div className="space-y-3">
              {summaries.map((summary) => {
                const isActive = activeCluster?.key === summary.key;

                if (!allowWarehouseNavigation) {
                  return (
                    <div
                      key={summary.key}
                      className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800">{summary.name}</p>
                        <span className="text-xs font-medium text-blue-600">
                          평균 충전율 {summary.avgFillPercent}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                        <span>품목 {summary.totalItems}개</span>
                        <span>총 재고 {summary.totalQty.toLocaleString()} EA</span>
                        <span className={summary.lowStock > 0 ? 'text-red-500 font-semibold' : ''}>
                          부족 {summary.lowStock}개
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600">
                        <i className="ri-compass-3-line text-sm" />
                        {isActive
                          ? '이 창고의 재고를 3D로 탐색 중입니다.'
                          : '창고 재고 정보를 확인하세요.'}
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    key={summary.key}
                    onClick={() => handleEnterWarehouse(summary.key)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                        : 'border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">{summary.name}</p>
                      <span className="text-xs font-medium text-blue-600">
                        평균 충전율 {summary.avgFillPercent}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                      <span>품목 {summary.totalItems}개</span>
                      <span>총 재고 {summary.totalQty.toLocaleString()} EA</span>
                      <span className={summary.lowStock > 0 ? 'text-red-500 font-semibold' : ''}>
                        부족 {summary.lowStock}개
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600">
                      <i className="ri-door-open-line text-sm" />
                      {isActive ? '현재 이 창고를 탐색 중입니다.' : '클릭해서 창고 내부로 이동'}
                    </div>
                  </button>
                );
              })}
              {!summaries.length && (
                <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
                  표시할 창고 데이터가 없습니다. 재고를 추가하면 자동으로 시각화됩니다.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-gray-900">선택한 재고</h3>
            {selectedItem ? (
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{selectedItem.itemName}</p>
                  <p className="text-xs text-gray-500">{selectedItem.itemNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">현재 재고</p>
                    <p className="text-base font-semibold">
                      {selectedItem.currentStock.toLocaleString()} {selectedItem.uomName}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">안전 재고</p>
                    <p className="text-base font-semibold">
                      {selectedItem.safetyStock.toLocaleString()} {selectedItem.uomName}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">창고</p>
                    <p className="text-base font-semibold">{selectedItem.warehouseName}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">카테고리</p>
                    <p className="text-base font-semibold">{selectedItem.category}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                  {selectedItem.currentStock >= selectedItem.safetyStock
                    ? '안전 재고 이상을 유지하고 있습니다.'
                    : '안전 재고 미만입니다. 재고 보충을 검토해주세요.'}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                창고 내부에서 박스를 클릭하면 상세 정보를 볼 수 있습니다.
              </div>
            )}
          </div>
        </aside>
      )}
    </section>
  );
};

export default WarehouseVisualizer;
