import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import WarehouseList from './components/WarehouseList';
import WarehouseStockPanel from './components/warehouseVisualizer/components/WarehouseStockPanel';
import { buildCluster } from './components/warehouseVisualizer/clusters';
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

describe('창고 화면 영어(i18n 3)', () => {
  it('창고 목록 제목, 버튼, 카드 버튼이 영어', async () => {
    renderWithProviders(<WarehouseList />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: 'Warehouses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add warehouse' })).toBeInTheDocument();
    expect((await screen.findAllByRole('button', { name: 'Details' })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'View in 3D' }).length).toBeGreaterThan(0);
  });

  it('창고 추가 모달의 라벨과 유형이 영어', async () => {
    renderWithProviders(<WarehouseList />, { locale: 'en' });
    await userEvent.click(screen.getByRole('button', { name: 'Add warehouse' }));
    const dialog = await screen.findByRole('dialog', { name: 'New warehouse' });
    expect(await within(dialog).findByLabelText('Warehouse name')).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: 'Raw materials' })).toBeInTheDocument();
  });

  it('재고 칸의 요약, 목록, 단계 이름이 영어', () => {
    const cluster = buildCluster([item('a', '볼트', 200, 50), item('b', '너트', 20, 50)], {
      warehouseId: 'wh-1',
      warehouseName: '1공장 창고',
    })[0];
    renderWithProviders(
      <WarehouseStockPanel cluster={cluster} total={5} selectedItemId="b" onSelect={() => {}} />,
      { locale: 'en' },
    );
    expect(screen.getByText(/1 of 2 items short/)).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Items (lowest stock ratio first)' });
    expect(within(list).getAllByRole('button')[0]).toHaveTextContent(/Short/);
    expect(screen.getByRole('button', { name: 'Open stock details' })).toBeInTheDocument();
  });
});
