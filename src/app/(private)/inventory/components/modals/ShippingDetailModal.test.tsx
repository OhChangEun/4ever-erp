import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { ok } from '@/mocks/utils';
import { INVENTORY_ENDPOINTS } from '@/app/types/api';
import ShippingDetailModal from './ShippingDetailModal';

/**
 * 카드 "없는 건은 404" 리뷰 관찰 3. 생산중 상세와 출고 준비 상세는 다른 API 다.
 * 같은 주문이 두 탭에 걸치면(생산중 → 출고 준비) 탭마다 자기 API 응답을 보여야 한다. 키가 같으면 앞 탭의 캐시가 30초 보인다
 */
const ORDER_ID = 'so-007';

const detail = (customerCompanyName: string, statusCode: string) => ({
  salesOrderId: ORDER_ID,
  salesOrderNumber: 'SO-2026-007',
  customerCompanyName,
  dueDate: '2026-02-05',
  statusCode,
  orderItems: [{ itemId: 'item-1001', itemName: '모터 A', quantity: 1, uomName: 'EA' }],
});

describe('출하 상세 모달의 하위 탭', () => {
  it('같은 주문을 생산중 탭과 출고 준비 탭에서 열면 각각 자기 API 응답이 보인다', async () => {
    server.use(
      http.get(INVENTORY_ENDPOINTS.PRODUCTIONDETAIL(ORDER_ID), () =>
        ok(detail('생산중 응답 고객', 'IN_PRODUCTION')),
      ),
      http.get(INVENTORY_ENDPOINTS.READY_TO_SHIP_DETAIL(ORDER_ID), () =>
        ok(detail('출고 준비 응답 고객', 'READY_TO_SHIP')),
      ),
    );
    // 한 QueryClient 안에서 두 탭의 모달을 같이 연다(같은 캐시를 쓴다)
    renderWithProviders(
      <>
        <ShippingDetailModal
          id="producing"
          onClose={() => {}}
          selectedSubTab="producing"
          selectedOrderId={ORDER_ID}
        />
        <ShippingDetailModal
          id="ready"
          onClose={() => {}}
          selectedSubTab="readyToShip"
          selectedOrderId={ORDER_ID}
        />
      </>,
    );

    expect(await screen.findByText('생산중 응답 고객')).toBeInTheDocument();
    expect(await screen.findByText('출고 준비 응답 고객')).toBeInTheDocument();
  });
});
