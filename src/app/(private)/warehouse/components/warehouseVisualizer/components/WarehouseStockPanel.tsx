'use client';

import { useLocale, useTranslations } from 'next-intl';
import { InventoryDetailModal } from '@/app/(private)/inventory/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import { BAND_TOKEN } from '../stockHeat';
import type { VisualizerItem, WarehouseCluster } from '../WarehouseVisualizerType';

const percentOf = (item: VisualizerItem) =>
  item.band === 'none' ? '-' : `${Math.round(item.fillRatio * 100)}%`;

/** 재고율 낮은 순. 기준 없는 품목(안전재고 0)은 뒤로 */
const byRatio = (a: VisualizerItem, b: VisualizerItem) => {
  if (a.band === 'none' || b.band === 'none')
    return Number(a.band === 'none') - Number(b.band === 'none');
  return a.fillRatio - b.fillRatio;
};

/**
 * 창고 3D 옆 칸(시각화 8). 요약, 재고율 낮은 순 품목 목록, 고른 품목과 재고 상세 열기.
 * 3D 를 못 쓰는 사람도 목록으로 같은 품목을 고르고 상세를 연다.
 */
export default function WarehouseStockPanel({
  cluster,
  total,
  selectedItemId,
  onSelect,
}: {
  cluster: WarehouseCluster;
  total: number;
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
}) {
  const t = useTranslations('warehouse');
  const locale = useLocale();
  const { openModal } = useModal();
  const items = [...cluster.items].sort(byRatio);
  const selected = cluster.items.find((i) => i.itemId === selectedItemId) ?? null;

  if (items.length === 0) return <p className="text-sm text-gray-500">{t('stockPanel.empty')}</p>;

  const short = items.filter((i) => i.band === 'short').length;
  const caution = items.filter((i) => i.band === 'caution').length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">
        {t('stockPanel.summary', { total: items.length, short, caution })}
        {total > items.length && ` ${t('stockPanel.truncated', { total, shown: items.length })}`}
      </p>

      <ul aria-label={t('stockPanel.listLabel')} className="max-h-64 space-y-1 overflow-auto">
        {items.map((item) => {
          const pressed = item.itemId === selectedItemId;
          return (
            <li key={item.itemId}>
              <button
                type="button"
                aria-pressed={pressed}
                onClick={() => onSelect(item.itemId)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm cursor-pointer ${
                  pressed ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block size-2.5 shrink-0 rounded-sm ${BAND_TOKEN[item.band].className}`}
                />
                <span className="flex-1 truncate">{item.itemName}</span>
                <span className="tabular-nums text-gray-600">{percentOf(item)}</span>
                <span className="w-14 text-right text-xs text-gray-500">
                  {t(`band.${item.band}`)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selected ? (
        <div className="space-y-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">{selected.itemName}</p>
          <p className="tabular-nums">
            {t('stockPanel.selectedStock', {
              current: selected.currentStock.toLocaleString(locale),
              safety: selected.safetyStock.toLocaleString(locale),
              uom: selected.uomName,
              percent: percentOf(selected),
              band: t(`band.${selected.band}`),
            })}
          </p>
          <button
            type="button"
            onClick={() =>
              openModal(InventoryDetailModal, {
                title: t('stockPanel.inventoryDetailTitle'),
                width: '1000px',
                selectedItemId: selected.itemId,
              })
            }
            className="text-sm text-blue-600 hover:underline cursor-pointer"
          >
            {t('stockPanel.openInventoryDetail')}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('stockPanel.pickHint')}</p>
      )}
    </div>
  );
}
