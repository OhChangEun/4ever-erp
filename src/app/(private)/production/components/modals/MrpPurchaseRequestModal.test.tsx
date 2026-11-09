import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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
