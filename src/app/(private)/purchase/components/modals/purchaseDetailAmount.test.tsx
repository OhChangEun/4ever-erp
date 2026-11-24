import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import PurchaseOrderDetailModal from './PurchaseOrderDetailModal';
import PurchaseRequestDetailModal from './PurchaseRequestDetailModal';

/** 총 금액이 5972000 처럼 날것으로 나왔다(카드 "품목 선택과 이동 내역" 화면 확인). 기본 목으로 그린다 */
describe('구매 상세의 총 금액은 원화 형식이다', () => {
  const expectFormatted = async (label: string, count: number) => {
    const labels = await screen.findAllByText(label);
    expect(labels).toHaveLength(count);
    for (const el of labels) expect(el.parentElement).toHaveTextContent(/₩[\d,]+$/);
  };

  it('구매 요청', async () => {
    renderWithProviders(
      <PurchaseRequestDetailModal purchaseRequestId="pr-015" onClose={() => {}} />,
    );
    await expectFormatted('총 금액', 1);
  });

  it('발주서(기본 정보와 합계 두 곳)', async () => {
    renderWithProviders(<PurchaseOrderDetailModal purchaseOrderId="po-015" onClose={() => {}} />);
    await expectFormatted('총 금액', 2);
  });
});
