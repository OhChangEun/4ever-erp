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
    // 남은 접근성과 디자인 카드: 이동 방향은 아이콘 대신 상태 글자 하나로 본다(지침 12장 아이콘 세 곳).
    // 예전엔 아이콘 개수(입고 2, 출고 2, 이동 3)를 셌다. 지금은 행마다 같은 글자가 붙는지 본다
    '$locale 최근 이동은 코드와 한국어 응답 모두 같은 라벨을 쓰고 아이콘이 없다',
    async ({ locale, labels }) => {
      server.use(
        http.get(INVENTORY_ENDPOINTS.RECENT_STOCK_MOVEMENT, () => ok({ content: movements })),
      );
      const { container } = renderWithProviders(<StockMovement />, { locale });
      await screen.findAllByText('Manager', { exact: false });
      const [inbound, outbound, transfer] = labels;
      const label = new RegExp(`^(${labels.join('|')})$`);
      // 행의 첫 글자 칸이 이동 종류(품목 이름이 '입고' 인 한국어 응답 행도 종류가 먼저)
      const rows = screen.getAllByRole('listitem');
      expect(rows.map((row) => within(row).getAllByText(label)[0]?.textContent)).toEqual([
        inbound,
        outbound,
        transfer,
        transfer,
        inbound,
        outbound,
        transfer,
      ]);
      expect(container.querySelectorAll('[class*="ri-"]')).toHaveLength(0);
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

  // 예전엔 참조 번호 줄(REF | 메모)과 바로 아래 줄에 같은 메모를 두 번 그렸다
  it('상세 이동 기록은 메모를 한 번만 보이고 참조 번호는 그대로 보인다', async () => {
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
          stockMovement: [
            { ...movements[0], referenceNumber: 'PO-2026-001', note: '긴급 보충분' },
            { ...movements[1], referenceNumber: 'SO-2026-002', note: '' },
          ],
        }),
      ),
    );
    renderWithProviders(
      <InventoryDetailModal id="detail" onClose={() => {}} selectedItemId="item-1001" />,
    );
    expect(await screen.findAllByText(/긴급 보충분/)).toHaveLength(1);
    expect(screen.getByText('PO-2026-001')).toBeInTheDocument();
    expect(screen.getByText('SO-2026-002')).toBeInTheDocument();
  });
});
