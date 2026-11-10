import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import WarehouseStockPanel from './WarehouseStockPanel';
import { buildCluster } from '../clusters';
import type { InventoryResponse } from '@/app/(private)/inventory';

const item = (id: string, name: string, current: number, safety: number): InventoryResponse => ({
  itemId: id,
  itemNumber: id,
  itemName: name,
  category: '자재',
  currentStock: current,
  forShipmentStock: 0,
  reservedStock: 0,
  safetyStock: safety,
  uomName: 'EA',
  unitPrice: 100,
  totalAmount: current * 100,
  warehouseName: '1공장 창고',
  warehouseType: 'RAW',
  statusCode: 'NORMAL',
  shelfNumber: 1,
});

const cluster = buildCluster(
  [item('a', '볼트', 200, 50), item('b', '너트', 20, 50), item('c', '와셔', 60, 50)],
  { warehouseId: 'wh-1', warehouseName: '1공장 창고' },
)[0];

describe('창고 재고 칸(시각화 8)', () => {
  it('요약과 재고율 낮은 순 목록', () => {
    renderWithProviders(
      <WarehouseStockPanel cluster={cluster} total={3} selectedItemId={null} onSelect={() => {}} />,
    );
    expect(screen.getByText(/품목 3개 중 부족 1개/)).toBeInTheDocument();
    const list = screen.getByRole('list', { name: '품목(재고율 낮은 순)' });
    const names = within(list)
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(names[0]).toMatch(/너트.*40%.*부족/);
    expect(names[2]).toMatch(/볼트.*400%.*많음/);
  });

  it('80개를 넘으면 일부만 그린다고 알린다', () => {
    renderWithProviders(
      <WarehouseStockPanel
        cluster={cluster}
        total={120}
        selectedItemId={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText(/120개 중 3개만 그렸습니다/)).toBeInTheDocument();
  });

  it('목록을 누르면 고르고, 고른 품목은 재고 상세를 연다', async () => {
    const onSelect = vi.fn();
    const { rerender } = renderWithProviders(
      <WarehouseStockPanel cluster={cluster} total={3} selectedItemId={null} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /너트/ }));
    expect(onSelect).toHaveBeenCalledWith('b');
    rerender(
      <WarehouseStockPanel cluster={cluster} total={3} selectedItemId="b" onSelect={onSelect} />,
    );
    expect(screen.getByRole('button', { name: /너트/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: '재고 상세 열기' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('품목이 없으면 안내', () => {
    const empty = buildCluster([], { warehouseId: 'wh-1', warehouseName: '빈 창고' })[0];
    renderWithProviders(
      <WarehouseStockPanel cluster={empty} total={0} selectedItemId={null} onSelect={() => {}} />,
    );
    expect(screen.getByText('이 창고에 재고가 없습니다.')).toBeInTheDocument();
  });
});
