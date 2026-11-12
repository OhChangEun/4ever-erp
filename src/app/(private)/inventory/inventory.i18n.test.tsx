import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/i18n/messages/en.json';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import { ModalProvider } from '@/app/components/common/modal/ModalProvider';
import { ToastProvider } from '@/app/components/common/toast/ToastProvider';
import InventoryClient from './InventoryClient';
import InventoryList from './components/tabs/InventoryList';
import StockTrend from './components/StockTrend';
import ReceivingManagementList from './components/tabs/ReceivingManagementList';
import WarehouseLayout from '../warehouse/layout';
import WarehouseStockPanel from '../warehouse/components/warehouseVisualizer/components/WarehouseStockPanel';
import { buildCluster } from '../warehouse/components/warehouseVisualizer/clusters';
import LowStockLayout from '../low-stock/layout';
import LowStockPage from '../low-stock/page';
import type { InventoryResponse } from '@/app/(private)/inventory';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/inventory',
}));

// 레이아웃 시험용. 앱 Providers 는 MSW 켜기와 개발 도구까지 들고 있어 테스트와 같은 것만 남긴다
vi.mock('@/app/(private)/_RouteProviders', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <ModalProvider>{children}</ModalProvider>
      </ToastProvider>
    </QueryClientProvider>
  ),
}));

/** 루트 레이아웃처럼 공통 메시지만 준다. 도메인 메시지는 라우트 레이아웃이 붙여야 한다 */
const renderUnderRoot = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Seoul">
      {ui}
    </NextIntlClientProvider>,
  );

const item = (id: string, name: string, current: number, safety: number): InventoryResponse => ({
  itemId: id,
  itemNumber: id,
  itemName: name,
  category: 'MATERIAL',
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

describe('재고 화면 영어(i18n 6)', () => {
  it('탭 이름과 통계 카드 제목이 영어, 건수에 단위 "건"이 붙지 않는다', async () => {
    renderWithProviders(<InventoryClient />, { locale: 'en' });
    const metrics = await screen.findByRole('region', { name: 'Metrics' });
    expect(await within(metrics).findByText('Total stock value')).toBeInTheDocument();
    expect(within(metrics).getByText('Shipped')).toBeInTheDocument();
    expect(within(metrics).queryByText(/건/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inventory' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shipping' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Receiving' })).toBeInTheDocument();
  });

  it('한국어 탭과 통계 카드는 예전과 같다(입고 완료 1,200건)', async () => {
    renderWithProviders(<InventoryClient />);
    const metrics = await screen.findByRole('region', { name: '지표' });
    expect(await within(metrics).findByText('총 재고 가치')).toBeInTheDocument();
    expect(within(metrics).getAllByText('1,200건').length).toBeGreaterThan(0);
    expect(within(metrics).getByText('₩1,200')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '입고 관리' })).toBeInTheDocument();
  });

  it('재고 목록의 표 머리, 버튼, 상태 필터, 부족 알림이 영어', async () => {
    renderWithProviders(<InventoryList />, { locale: 'en' });
    // 표 위 제목은 탭 이름(Inventory)과 겹쳐 지웠다(카드 표 테두리 한 겹). 탭 글자는 위 InventoryClient 테스트가 본다
    expect(screen.queryByRole('heading', { name: 'Inventory' })).not.toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: 'On hand' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add material' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Low stock alerts' })).toBeInTheDocument();
    expect(await screen.findByText('On hand: 20EA / Min: 50EA')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent stock movements' })).toBeInTheDocument();
  });

  it('한국어 부족 알림 줄은 예전과 같다', async () => {
    renderWithProviders(<InventoryList />);
    expect(await screen.findByText('현재: 20EA / 최소: 50EA')).toBeInTheDocument();
    expect(screen.getByText('1건')).toBeInTheDocument();
  });

  it('입고 관리 표 머리가 영어', async () => {
    renderWithProviders(<ReceivingManagementList />, { locale: 'en' });
    expect(await screen.findByRole('columnheader', { name: 'PO no.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Pending/ })).toBeInTheDocument();
  });

  it('재고 추이 요약, 표 전환, 소진 예상이 영어(복수형)', async () => {
    renderWithProviders(<StockTrend itemId="item-1001" />, { locale: 'en' });
    const summary = await screen.findByText(/Over 30 days/);
    expect(screen.getByRole('region', { name: 'Stock trend (30 days)' })).toContainElement(summary);
    expect(summary).toHaveTextContent(/to 120 EA/);
    expect(summary).toHaveTextContent('Safety stock 50.');
    expect(summary).toHaveTextContent(/in about 1[3-6] days\./);
    await userEvent.click(screen.getByRole('button', { name: 'Show table' }));
    expect(screen.getByRole('table', { name: 'Stock trend table' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Stock (EA)' })).toBeInTheDocument();
  });
});

describe('다른 화면에서 여는 재고 모달(i18n 6)', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
  });

  it('창고 레이아웃은 창고와 재고 메시지를 둘 다 준다. 3D 패널에서 연 재고 상세가 영어', async () => {
    const cluster = buildCluster([item('item-1001', '볼트', 20, 50)], {
      warehouseId: 'wh-1',
      warehouseName: '1공장 창고',
    })[0];
    renderUnderRoot(
      <WarehouseLayout>
        <WarehouseStockPanel
          cluster={cluster}
          total={1}
          selectedItemId="item-1001"
          onSelect={() => {}}
        />
      </WarehouseLayout>,
    );
    // 영어 메시지는 받은 뒤에 바뀐다. 창고 문구(패널 버튼)가 영어면 창고 메시지가 있다
    await userEvent.click(await screen.findByRole('button', { name: 'Open stock details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Stock details' });
    // 재고 문구(상세, 재고 추이)도 영어면 재고 메시지가 합쳐져 있다
    expect(await within(dialog).findByText('Basic info')).toBeInTheDocument();
    expect(
      await within(dialog).findByRole('region', { name: 'Stock trend (30 days)' }),
    ).toBeInTheDocument();
  });

  it('안전재고 레이아웃은 재고 메시지도 준다. 발주 요청 모달과 통계가 영어', async () => {
    // 버튼은 게이트웨이가 받는 역할에게만 보인다(생산 버튼 권한 카드)
    useAuthStore
      .getState()
      .setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role: 'MM_USER' });
    renderUnderRoot(
      <LowStockLayout>
        <LowStockPage />
      </LowStockLayout>,
    );
    const metrics = await screen.findByRole('region', { name: 'Metrics' });
    expect(await within(metrics).findByText('Urgent shortages')).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Select all low-stock items' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Order selected' }));
    const dialog = await screen.findByRole('dialog', { name: 'Order request' });
    expect(
      await within(dialog).findByRole('button', { name: 'Request order' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Total order amount')).toBeInTheDocument();
  });

  it('한국어 안전재고 화면 문구는 예전과 같다', async () => {
    // 버튼은 게이트웨이가 받는 역할에게만 보인다(생산 버튼 권한 카드)
    useAuthStore
      .getState()
      .setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role: 'MM_USER' });
    renderWithProviders(<LowStockPage />);
    const metrics = await screen.findByRole('region', { name: '지표' });
    expect(await within(metrics).findByText('긴급 재고 부족')).toBeInTheDocument();
    expect(within(metrics).getAllByText('1,200건').length).toBeGreaterThan(0);
    await userEvent.click(await screen.findByRole('checkbox', { name: '베어링 B 선택' }));
    await userEvent.click(screen.getByRole('button', { name: '선택 품목 발주' }));
    const dialog = await screen.findByRole('dialog', { name: '발주 요청' });
    expect(await within(dialog).findByText('현재: 20 EA / 안전: 50 EA')).toBeInTheDocument();
    expect(within(dialog).getByText('(부족: 30)')).toBeInTheDocument();
  });
});
