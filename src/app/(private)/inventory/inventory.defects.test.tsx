import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { ok } from '@/mocks/utils';
import { INVENTORY_ENDPOINTS } from '@/app/types/api';
import InventoryList from './components/tabs/InventoryList';
import InventoryDetailModal from './components/modals/InventoryDetailModal';
import StockMovement from './components/StockMovement';
import { getMovementColor, getMovementIcon } from './inventory.utils';

const inventory = {
  itemId: 'item-1001',
  itemNumber: 'ITM-1001',
  itemName: 'Test item',
  category: 'RAW_MATERIAL',
  currentStock: 120,
  forShipmentStock: 0,
  reservedStock: 0,
  safetyStock: 50,
  uomName: 'EA',
  unitPrice: 100,
  totalAmount: 12000,
  warehouseName: 'Test warehouse',
  warehouseType: 'MATERIAL',
  statusCode: 'NORMAL',
};
const movements = ['IN', 'OUT', 'MOVE', 'TRANSFER', '입고', '출고', '이동'].map((type) => ({
  type,
  quantity: 1,
  uomName: 'EA',
  itemName: type,
  workDate: '2026-11-10',
  managerName: 'Manager',
  from: 'Source',
  to: 'Destination',
  movementDate: '2026-11-10',
  referenceNumber: type,
  note: '',
}));

describe('재고 코드 표시 결함', () => {
  it.each([
    { locale: 'ko', category: '원자재', warehouse: '원자재창고' },
    { locale: 'en', category: 'Raw material', warehouse: 'Raw materials warehouse' },
  ] satisfies { locale: 'ko' | 'en'; category: string; warehouse: string }[])(
    '$locale 목록과 상세가 분류 및 창고 코드를 번역한다',
    async ({ locale, category, warehouse }) => {
      server.use(
        http.get(INVENTORY_ENDPOINTS.INVENTORY_LIST, () =>
          ok({
            content: [inventory],
            page: { number: 0, size: 10, totalElements: 1, totalPages: 1, hasNext: false },
          }),
        ),
        http.get(INVENTORY_ENDPOINTS.INVENTORY_DETAIL('item-1001'), () =>
          ok({
            ...inventory,
            supplierCompanyName: 'Supplier',
            warehouseId: 'wh-1',
            warehouseNumber: 'WH-1',
            location: 'A-1',
            lastModified: '2026-11-10',
            description: '',
            stockMovement: [],
          }),
        ),
      );
      const view = renderWithProviders(<InventoryList />, { locale });
      expect(await screen.findByText(category)).toBeInTheDocument();
      expect(screen.getByText(warehouse)).toBeInTheDocument();
      view.unmount();
      renderWithProviders(
        <InventoryDetailModal id="detail" onClose={() => {}} selectedItemId="item-1001" />,
        { locale },
      );
      expect(await screen.findByText(category)).toBeInTheDocument();
    },
  );

  it.each([
    { type: 'IN', icon: 'ri-arrow-down-line', color: 'text-green-600' },
    { type: 'OUT', icon: 'ri-arrow-up-line', color: 'text-red-600' },
    { type: 'MOVE', icon: 'ri-arrow-left-right-line', color: 'text-blue-600' },
    { type: 'TRANSFER', icon: 'ri-arrow-left-right-line', color: 'text-blue-600' },
  ])('$type 아이콘과 색상은 한국어 값과 같다', ({ type, icon, color }) => {
    expect(getMovementIcon(type)).toBe(icon);
    expect(getMovementColor(type)).toContain(color);
  });

  it.each([
    { locale: 'ko', labels: ['입고', '출고', '이동'] },
    { locale: 'en', labels: ['Inbound', 'Outbound', 'Transfer'] },
  ] satisfies { locale: 'ko' | 'en'; labels: string[] }[])(
    '$locale 최근 이동은 코드와 한국어 응답 모두 같은 라벨과 아이콘을 쓴다',
    async ({ locale, labels }) => {
      server.use(
        http.get(INVENTORY_ENDPOINTS.RECENT_STOCK_MOVEMENT, () => ok({ content: movements })),
      );
      const { container } = renderWithProviders(<StockMovement />, { locale });
      await screen.findAllByText('Manager', { exact: false });
      for (const label of labels)
        expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(2);
      expect(container.querySelectorAll('.ri-arrow-down-line')).toHaveLength(2);
      expect(container.querySelectorAll('.ri-arrow-up-line')).toHaveLength(2);
      expect(container.querySelectorAll('.ri-arrow-left-right-line')).toHaveLength(3);
    },
  );

  it('상세 이동 기록은 코드 응답에서도 출발지와 도착지를 표시한다', async () => {
    server.use(
      http.get(INVENTORY_ENDPOINTS.INVENTORY_DETAIL('item-1001'), () =>
        ok({
          ...inventory,
          supplierCompanyName: 'Supplier',
          warehouseId: 'wh-1',
          warehouseNumber: 'WH-1',
          location: 'A-1',
          lastModified: '2026-11-10',
          description: '',
          stockMovement: movements,
        }),
      ),
    );
    const { container } = renderWithProviders(
      <InventoryDetailModal id="detail" onClose={() => {}} selectedItemId="item-1001" />,
      { locale: 'en' },
    );
    const reference = await screen.findByText(/^TRANSFER/);
    const row = reference.closest('.flex.items-start');
    expect(row).toHaveTextContent('Source → Destination');
    if (row instanceof HTMLElement) expect(within(row).getByText('Transfer')).toBeInTheDocument();
    expect(container.querySelectorAll('.ri-arrow-down-line')).toHaveLength(2);
  });
});
