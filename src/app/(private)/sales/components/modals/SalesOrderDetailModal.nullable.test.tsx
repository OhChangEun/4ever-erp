import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { dropAt, nullAt, serveEdited, valueAt } from '@/test/contract/mockData';
import { SALES_ENDPOINTS } from '@/app/types/api';
import SalesOrderDetailModal from './SalesOrderDetailModal';

describe('주문 상세 모달의 빈 값(응답 null 허용 카드)', () => {
  it.each([
    ['null', nullAt],
    ['키 누락', dropAt],
  ])('특이사항이 %s 이어도 주문과 고객 정보를 그린다', async (_, edit) => {
    const data = await serveEdited(SALES_ENDPOINTS.ORDER_DETAIL('so-1'), (d) => {
      edit(d, ['note']);
    });
    renderWithProviders(
      <SalesOrderDetailModal id="m" onClose={() => undefined} selectedSalesOrderId="so-1" />,
    );

    expect(
      await screen.findByText(String(valueAt(data, ['customer', 'customerName']))),
    ).toBeInTheDocument();
  });
});
