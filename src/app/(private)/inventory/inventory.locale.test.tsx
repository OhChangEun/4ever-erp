import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import { mockBrowserLocale } from '@/test/browserLocale';
import { ok } from '@/mocks/utils';
import { INVENTORY_ENDPOINTS, LOWSTOCK_ENDPOINTS } from '@/app/types/api';
import InventoryList from './components/tabs/InventoryList';
import LowStockList from '../low-stock/components/LowStockList';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/inventory',
}));

const page = { number: 0, size: 10, totalElements: 1, totalPages: 1, hasNext: false };
const stock = {
  itemId: 'item-9',
  itemNumber: 'ITM-9',
  itemName: '볼트 C',
  category: 'MATERIAL',
  currentStock: 1200,
  forShipmentStock: 2500,
  reservedStock: 3000,
  safetyStock: 5000,
  uomName: 'EA',
  unitPrice: 100,
  totalAmount: 120000,
  warehouseName: '1공장 창고',
  warehouseNumber: 'WH-001',
  warehouseType: 'RAW',
  statusCode: 'URGENT',
  shelfNumber: 1,
};

/** 화면 언어가 아니라 브라우저 언어(de-DE)가 숫자 자리 구분을 바꾸면 안 된다(1.200 이 아니라 1,200) */
describe('브라우저 언어가 de-DE 여도 재고 수량은 쉼표로 묶는다', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clearUserInfo();
  });

  it('재고 목록 표', async () => {
    mockBrowserLocale('de-DE');
    server.use(http.get(INVENTORY_ENDPOINTS.INVENTORY_LIST, () => ok({ content: [stock], page })));
    renderWithProviders(<InventoryList />);
    const row = (await screen.findByText('볼트 C')).closest('tr');
    if (!row) throw new Error('행이 없다');
    expect(within(row).getByText('1,200 EA')).toBeInTheDocument();
    expect(within(row).getByText('2,500 EA')).toBeInTheDocument();
    expect(within(row).getByText('3,000 EA')).toBeInTheDocument();
    expect(within(row).getByText('5,000 EA')).toBeInTheDocument();
  });

  it('안전재고 목록과 발주 요청 모달', async () => {
    // 버튼은 게이트웨이가 받는 역할에게만 보인다(생산 버튼 권한 카드)
    useAuthStore
      .getState()
      .setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role: 'MM_USER' });
    mockBrowserLocale('de-DE');
    server.use(http.get(LOWSTOCK_ENDPOINTS.LOW_STOCK_LIST, () => ok({ content: [stock], page })));
    renderWithProviders(<LowStockList />);
    const row = (await screen.findByText('볼트 C')).closest('tr');
    if (!row) throw new Error('행이 없다');
    expect(within(row).getByText('1,200 EA')).toBeInTheDocument();
    expect(within(row).getByText('5,000 EA')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: '볼트 C 선택' }));
    await userEvent.click(screen.getByRole('button', { name: '선택 품목 발주' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 요청' });
    expect(await within(dialog).findByText('현재: 1,200 EA / 안전: 5,000 EA')).toBeInTheDocument();
    expect(within(dialog).getByText('(부족: 3,800)')).toBeInTheDocument();
  });
});
