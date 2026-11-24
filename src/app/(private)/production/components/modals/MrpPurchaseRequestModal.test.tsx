import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { ok } from '@/mocks/utils';
import { scenarioResponse } from '@/mocks/scenario';
import { INVENTORY_ENDPOINTS } from '@/app/types/api';
import MrpPurchaseRequestModal from './MrpPurchaseRequestModal';
import type { MrpPlannedOrderList } from '../../types/MrpPlannedOrdersListApiType';

const orders: MrpPlannedOrderList[] = [
  {
    mrpRunId: 'run-1',
    quotationNumber: 'Q-2026-001',
    itemId: 'item-1',
    itemName: '베어링',
    quantity: 10,
    status: 'PLANNED',
    procurementStartDate: '2026-11-10',
    expectedArrivalDate: '2026-11-20',
  },
];

const renderModal = () =>
  renderWithProviders(
    <MrpPurchaseRequestModal
      id="m1"
      onClose={() => undefined}
      orders={orders}
      onConfirm={() => undefined}
    />,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MRP 자재 구매 요청 모달', () => {
  it('품목 정보를 받으면 행과 총액을 그린다', async () => {
    server.use(
      http.post(INVENTORY_ENDPOINTS.MATERIALS_LIST, () =>
        ok([
          {
            itemId: 'item-1',
            itemName: '베어링',
            itemNmber: 'ITM-1',
            unitPrice: 1500,
            supplierName: '대한금속',
          },
        ]),
      ),
    );
    renderModal();
    expect(await screen.findByText('대한금속')).toBeInTheDocument();
    expect(screen.getAllByText('₩15,000').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '구매 요청 확정' })).toBeEnabled();
  });

  it('기본 목도 고른 계획 주문의 자재를 준다(품목표 이름, 단가, 공급사)', async () => {
    renderWithProviders(
      <MrpPurchaseRequestModal
        id="m3"
        onClose={() => undefined}
        orders={[
          { ...orders[0], mrpRunId: 'mrp-001', itemId: 'item-1002', itemName: '베어링 B' },
          { ...orders[0], mrpRunId: 'mrp-003', itemId: 'item-wh-004', itemName: '알루미늄 판' },
        ]}
        onConfirm={() => undefined}
      />,
    );
    // 품목표 단가 8,000 × 10
    const bearing = await screen.findByRole('row', { name: /베어링 B/ });
    expect(bearing).toHaveTextContent('₩80,000');
    expect(bearing).toHaveTextContent('대양상사');
    expect(screen.getByRole('row', { name: /알루미늄 판/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '구매 요청 확정' })).toBeEnabled();
  });

  it('같은 자재의 주문이 둘이면 줄도 둘이고 React key 가 겹치지 않는다', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderWithProviders(
      <MrpPurchaseRequestModal
        id="m4"
        onClose={() => undefined}
        orders={[
          { ...orders[0], mrpRunId: 'mrp-001', itemId: 'item-1002', quantity: 10 },
          { ...orders[0], mrpRunId: 'mrp-014', itemId: 'item-1002', quantity: 30 },
        ]}
        onConfirm={() => undefined}
      />,
    );
    const rows = await screen.findAllByRole('row', { name: /베어링 B/ });
    expect(rows.map((row) => within(row).getAllByRole('cell')[4].textContent)).toEqual([
      '₩80,000',
      '₩240,000',
    ]);
    expect(consoleError.mock.calls.map((call) => String(call[0])).join()).not.toContain('same key');
  });

  it('표 스크롤 칸은 이름 있는 region 이고 Tab 으로 닿는다', async () => {
    renderWithProviders(
      <MrpPurchaseRequestModal
        id="m5"
        onClose={() => undefined}
        orders={[{ ...orders[0], itemId: 'item-1002' }]}
        onConfirm={() => undefined}
      />,
    );
    const region = await screen.findByRole('region', { name: '구매 요청 자재 목록' });
    expect(region).toContainElement(screen.getByRole('table'));
    await userEvent.tab();
    expect(region).toHaveFocus();
  });

  it('품목 정보가 없는 주문이 섞이면 몇 건인지 알리고 확정을 막는다', async () => {
    renderWithProviders(
      <MrpPurchaseRequestModal
        id="m6"
        onClose={() => undefined}
        orders={[
          { ...orders[0], mrpRunId: 'mrp-001', itemId: 'item-1002' },
          { ...orders[0], mrpRunId: 'mrp-002', itemId: 'nope', itemName: '단종 볼트' },
        ]}
        onConfirm={() => undefined}
      />,
    );
    expect(await screen.findByText(/품목 정보가 없는 주문 1건\(단종 볼트\)/)).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /베어링 B/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '구매 요청 확정' })).toBeDisabled();
  });

  it('전부 품목 정보가 없으면 빈 안내 대신 그 이유를 보인다', async () => {
    renderWithProviders(
      <MrpPurchaseRequestModal
        id="m7"
        onClose={() => undefined}
        orders={[{ ...orders[0], itemId: 'nope', itemName: '단종 볼트' }]}
        onConfirm={() => undefined}
      />,
      { locale: 'en' },
    );
    expect(await screen.findByText(/1 order has no item info \(단종 볼트\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm/ })).not.toBeInTheDocument();
  });

  it('조회가 실패하면 오류를 보이고 확정 버튼이 없다(빈 요청을 막는다)', async () => {
    server.use(http.post(INVENTORY_ENDPOINTS.MATERIALS_LIST, () => scenarioResponse('500')));
    renderModal();
    await waitFor(() =>
      expect(screen.getByText(/자재 정보를 불러오지 못했습니다/)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: '구매 요청 확정' })).not.toBeInTheDocument();
  });

  it('주문이 없으면 안내만 보이고 확정 버튼이 없다(리뷰 A1)', () => {
    renderWithProviders(
      <MrpPurchaseRequestModal
        id="m2"
        onClose={() => undefined}
        orders={[]}
        onConfirm={() => undefined}
      />,
    );
    expect(screen.getByText('구매 요청할 자재가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '구매 요청 확정' })).not.toBeInTheDocument();
  });
});
