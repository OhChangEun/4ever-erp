import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { ok } from '@/mocks/utils';
import { SALES_ENDPOINTS } from '@/app/types/api';
import QuoteDetailModal from './QuoteDetailModal';

/**
 * 남은 표시 결함 3 카드(R09)와 리뷰 의견. 품목 행 key 는 품목 ID 와 순번을 묶는다.
 * 품목 ID 만 쓰면 같은 품목이 두 줄인 견적에서 key 가 겹친다. 정렬과 삭제가 없는 읽기 표라 순번을 붙여도 된다.
 */
const item = (itemId: string, itemName: string, quantity: number) => ({
  itemId,
  itemName,
  quantity,
  uomName: 'EA',
  unitPrice: 1000,
  amount: 1000 * quantity,
});

const detail = (items: ReturnType<typeof item>[]) => ({
  quotationId: 'q-1',
  quotationNumber: 'QT-2026-001',
  quotationDate: '2026-01-10',
  dueDate: '2026-02-01',
  statusCode: 'APPROVAL',
  customerName: '한빛전자',
  ceoName: '박대표',
  items,
  totalAmount: 10000,
});

describe('견적 상세 품목 행', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('같은 품목이 두 줄이어도 key 경고 없이 두 줄이 다 보인다', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      http.get(SALES_ENDPOINTS.QUOTE_DETAIL('q-1'), () =>
        ok(
          detail([
            item('item-1', '모터 A', 3),
            item('item-1', '모터 A', 7),
            item('item-2', '펌프 B', 1),
          ]),
        ),
      ),
    );
    renderWithProviders(<QuoteDetailModal id="m" onClose={() => {}} selectedQuotationId="q-1" />);

    const rows = (await screen.findAllByText('모터 A')).map((cell) => cell.closest('tr'));
    expect(rows).toHaveLength(2);
    const quantities = rows.map((row) => {
      if (!row) throw new Error('품목 행이 없다');
      return within(row).getAllByRole('cell')[1].textContent;
    });
    expect(quantities).toEqual(['3', '7']);
    expect(screen.getByText('펌프 B')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
