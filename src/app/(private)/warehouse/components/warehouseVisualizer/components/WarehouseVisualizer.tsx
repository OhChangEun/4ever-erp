'use client';

import { Canvas } from '@react-three/fiber';
import { useTranslations } from 'next-intl';
import { BAND_TOKEN, BANDS } from '../stockHeat';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import WarehouseStockPanel from './WarehouseStockPanel';
import { Environment, OrbitControls } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import {
  type ViewMode,
  type WarehouseFilter,
  type WarehouseVisualizerProps,
} from '../WarehouseVisualizerType';
import { summarizeClusters } from '../clusters';
import { useWarehouseClusters } from '../useWarehouseClusters';
import WarehouseScene from './WarehouseScene';
import FreeCameraControls from './FreeCameraControls';
import { formatNumber } from '@/app/utils/number';

const WarehouseVisualizer = ({
  warehouseId,
  warehouseName,
  hideSummary,
}: WarehouseVisualizerProps) => {
  const t = useTranslations('warehouse');
  const tv = useTranslations('warehouse.visualizer');
  // 계산은 이름 없는 창고를 null 로 준다. 글자는 여기서
  const nameOf = (name: string | null) => name ?? tv('unnamedWarehouse');
  const filterOptions = useMemo<WarehouseFilter | undefined>(
    () => (warehouseId ? { warehouseId, warehouseName } : undefined),
    [warehouseId, warehouseName],
  );

  const { clusters, total, isLoading, isError, error } = useWarehouseClusters(filterOptions);
  // 활성 창고: 특정 창고 화면이면 그 창고, 아니면 사용자가 들어간 창고(지금 목록에 있을 때만)
  const [chosenWarehouseKey, setChosenWarehouseKey] = useState<string | null>(null);
  const activeWarehouseKey =
    filterOptions?.warehouseId ??
    (chosenWarehouseKey && clusters.some((cluster) => cluster.key === chosenWarehouseKey)
      ? chosenWarehouseKey
      : null);
  // 선택 품목 id. 블록과 옆 목록이 같은 값을 쓴다(시각화 8)
  const [pickedItemId, setPickedItemId] = useState<string | null>(null);
  const [freeMode, setFreeMode] = useState(false);

  const activeCluster = useMemo(
    () => clusters.find((cluster) => cluster.key === activeWarehouseKey) ?? null,
    [clusters, activeWarehouseKey],
  );

  const viewMode: ViewMode = activeCluster ? 'warehouse' : 'overview';
  const allowWarehouseNavigation = !filterOptions;
  const canvasHeight = 600;

  // 재조회로 품목이 바뀌어도 같은 itemId 가 지금 창고에 있으면 선택을 유지한다. 없으면 고른 것 없음
  const selectedItemId =
    viewMode === 'overview'
      ? null
      : (activeCluster?.items.find((item) => item.itemId === pickedItemId)?.itemId ?? null);

  const summaries = useMemo(() => summarizeClusters(clusters), [clusters]);

  const handleEnterWarehouse = (key: string) => {
    setChosenWarehouseKey(key);
    setPickedItemId(null);
  };

  const handleExitWarehouse = () => {
    if (!allowWarehouseNavigation) return;
    setChosenWarehouseKey(null);
    setPickedItemId(null);
  };

  return (
    <section
      className={hideSummary ? 'grid gap-6' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{tv('title')}</h2>
            <p className="text-sm text-gray-500">{tv('help')}</p>
          </div>

          {/* 재고율 4단계 + 기준 없음(시각화 8). 색은 장면과 같은 토큰 */}
          <div
            aria-label={tv('legend')}
            className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
          >
            {BANDS.map((band) => (
              <span key={band} className="flex items-center gap-1">
                <span
                  className={`inline-flex h-3 w-3 rounded-full ${BAND_TOKEN[band].className}`}
                />
                {t(`band.${band}`)}
              </span>
            ))}
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100"
          style={{ height: canvasHeight }}
        >
          {isLoading && (
            <div
              role="status"
              className="absolute inset-0 z-local flex items-center justify-center text-sm text-gray-600"
            >
              {tv('loading')}
            </div>
          )}
          {isError && (
            <div className="absolute inset-x-4 top-16 z-local">
              <TableStatusBox type="error" message={tv('loadError')} error={error} />
            </div>
          )}
          {viewMode === 'warehouse' && (
            <button
              type="button"
              onClick={() => setFreeMode((prev) => !prev)}
              className="absolute right-4 bottom-4 z-local rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-gray-700 shadow hover:bg-blue-50"
            >
              {freeMode ? tv('freeModeOff') : tv('freeModeOn')}
            </button>
          )}
          {viewMode === 'warehouse' && activeCluster && (
            <div className="absolute left-4 top-4 z-local flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-gray-700 shadow">
              <i className="ri-home-5-line text-base text-blue-600"></i>
              <span>{nameOf(activeCluster.name)}</span>
            </div>
          )}

          {allowWarehouseNavigation && viewMode === 'warehouse' && (
            <button
              type="button"
              onClick={handleExitWarehouse}
              className="absolute right-4 top-4 z-local inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-blue-700 shadow transition hover:bg-blue-50"
            >
              <i className="ri-arrow-left-line text-sm"></i>
              <span>{tv('backToWarehouses')}</span>
            </button>
          )}

          {allowWarehouseNavigation && viewMode === 'overview' && (
            <div className="pointer-events-none absolute left-4 top-4 z-local rounded-lg bg-white/85 px-3 py-2 text-xs text-gray-600 shadow">
              {tv('overviewHint')}
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
                selectedItemId={selectedItemId}
                onSelectWarehouse={handleEnterWarehouse}
                onSelectItem={(item) => setPickedItemId(item.itemId)}
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
            <h3 className="mb-3 text-base font-semibold text-gray-900">{tv('summaryTitle')}</h3>
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
                        <p className="text-sm font-semibold text-gray-800">
                          {nameOf(summary.name)}
                        </p>
                        <span className="text-xs font-medium text-blue-600">
                          {tv('avgFill', { percent: summary.avgFillPercent })}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                        <span>{tv('itemCount', { count: summary.totalItems })}</span>
                        <span>{tv('totalQty', { qty: formatNumber(summary.totalQty) })}</span>
                        <span className={summary.lowStock > 0 ? 'text-red-500 font-semibold' : ''}>
                          {tv('lowStock', { count: summary.lowStock })}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600">
                        <i className="ri-compass-3-line text-sm" />
                        {isActive ? tv('exploringFixed') : tv('checkStock')}
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
                      <p className="text-sm font-semibold text-gray-800">{nameOf(summary.name)}</p>
                      <span className="text-xs font-medium text-blue-600">
                        {tv('avgFill', { percent: summary.avgFillPercent })}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                      <span>{tv('itemCount', { count: summary.totalItems })}</span>
                      <span>{tv('totalQty', { qty: formatNumber(summary.totalQty) })}</span>
                      <span className={summary.lowStock > 0 ? 'text-red-500 font-semibold' : ''}>
                        {tv('lowStock', { count: summary.lowStock })}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600">
                      <i className="ri-door-open-line text-sm" />
                      {isActive ? tv('exploring') : tv('enter')}
                    </div>
                  </button>
                );
              })}
              {!summaries.length && (
                <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
                  {tv('noData')}
                </p>
              )}
            </div>
          </div>

          {activeCluster && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-gray-900">{tv('stockRateTitle')}</h3>
              {isLoading || isError ? (
                <p className="text-sm text-gray-500">{tv('waitForStock')}</p>
              ) : (
                <WarehouseStockPanel
                  cluster={activeCluster}
                  total={total}
                  selectedItemId={selectedItemId}
                  onSelect={setPickedItemId}
                />
              )}
            </div>
          )}
        </aside>
      )}
    </section>
  );
};

export default WarehouseVisualizer;
