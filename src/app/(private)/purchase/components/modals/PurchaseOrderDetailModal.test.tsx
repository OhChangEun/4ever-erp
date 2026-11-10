import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { PURCHASE_ENDPOINTS } from '@/app/(private)/purchase/api/purchase.endpoints';
import PurchaseOrderDetailModal from './PurchaseOrderDetailModal';

/**
 * 린트 3차에서 찾은 결함: `if (!order) return null` 이 로딩, 오류 검사보다 앞에 있어
 * 불러오는 중에도, 실패해도 빈 화면이었다(실패를 숨김, 우선순위 2).
 */
const URL = PURCHASE_ENDPOINTS.PURCHASE_ORDER_DETAIL('po-1');

describe('발주서 상세 모달', () => {
  it('불러오는 동안 로딩 상자를 보인다', async () => {
    server.use(
      http.get(URL, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    renderWithProviders(<PurchaseOrderDetailModal purchaseOrderId="po-1" onClose={() => {}} />);
    expect(await screen.findByText('발주서 상세정보를 불러오는 중입니다...')).toBeInTheDocument();
  });

  it('실패하면 오류 상자를 보인다(빈 화면이 아니다)', async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({ status: 500, success: false, message: 'x' }, { status: 500 }),
      ),
    );
    renderWithProviders(<PurchaseOrderDetailModal purchaseOrderId="po-1" onClose={() => {}} />);
    expect(
      await screen.findByText('발주서 데이터를 불러오는 중 오류가 발생했습니다.'),
    ).toBeInTheDocument();
  });
});
