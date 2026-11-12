import { describe, expect, it } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { error, makePage, ok } from '@/mocks/utils';
import { SALES_ENDPOINTS } from '@/app/types/api';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { countRequests } from '@/test/countRequests';
import SalesQuoteList from './SalesQuoteList';
import QuoteReviewModal from '../modals/QuoteReviewModal';
import { postQuotationConfirm } from '../../sales.api';

/**
 * 이미 처리된 건의 버튼 카드. 기본 목 견적: QT-2026-001 승인, 002 대기, 003 검토중, 004 반려.
 * 처리(검토 요청, 즉시 납품)는 대기(PENDING) 견적만 한다(카드 결정 2, verified=false).
 */
const REVIEW = '견적 검토 요청';
const DELIVER = '즉시 납품 처리';
const checkbox = (number: string) => screen.findByRole('checkbox', { name: `${number} 선택` });

const quote = (quotationId: string, quotationNumber: string, statusCode: string) => ({
  quotationId,
  quotationNumber,
  customerName: '한빛전자',
  managerName: '김영업',
  quotationDate: '2026-01-14',
  dueDate: '2026-02-14',
  totalAmount: 1000,
  statusCode,
});
const useQuotes = (rows: ReturnType<typeof quote>[]) =>
  server.use(
    http.get(SALES_ENDPOINTS.QUOTES_LIST, () =>
      ok({ content: rows, page: makePage(0, 10, rows.length) }),
    ),
  );

describe('영업 견적 목록: 처리한 견적은 다시 고를 수 없다', () => {
  it('대기 견적만 고를 수 있다', async () => {
    renderWithProviders(<SalesQuoteList />);
    expect(await checkbox('QT-2026-002')).toBeEnabled();
    expect(await checkbox('QT-2026-001')).toBeDisabled();
    expect(await checkbox('QT-2026-003')).toBeDisabled();
    expect(await checkbox('QT-2026-004')).toBeDisabled();
  });

  it('모르는 상태 값의 견적은 고를 수 없다', async () => {
    useQuotes([quote('qt-x', 'QT-UNKNOWN', 'ON_HOLD')]);
    renderWithProviders(<SalesQuoteList />);
    expect(await checkbox('QT-UNKNOWN')).toBeDisabled();
  });

  it('즉시 납품 뒤 모달 버튼이 사라지고 두 번째 요청이 없으며, 목록에서 그 견적을 다시 고를 수 없다', async () => {
    const posts = countRequests('POST', SALES_ENDPOINTS.QUOTE_DELIVERY_PROCESS('qt-002'));
    const user = userEvent.setup();
    renderWithProviders(<SalesQuoteList />);

    await user.click(await checkbox('QT-2026-002'));
    await user.click(screen.getByRole('button', { name: REVIEW }));
    const dialog = within(await screen.findByRole('dialog', { name: REVIEW }));
    await user.click(await dialog.findByRole('button', { name: '재고 확인' }));
    await user.click(await dialog.findByRole('button', { name: DELIVER }));

    await waitFor(() =>
      expect(dialog.queryByRole('button', { name: DELIVER })).not.toBeInTheDocument(),
    );
    expect(posts()).toBe(1);

    await user.keyboard('{Escape}');
    const box = await checkbox('QT-2026-002');
    expect(box).toBeDisabled();
    expect(box).not.toBeChecked();
    expect(screen.getByRole('button', { name: REVIEW })).toBeDisabled();
  });

  it('고른 견적이 다시 받은 목록에서 대기가 아니면 선택에서 빠진다', async () => {
    useQuotes([quote('qt-1', 'QT-ONE', 'PENDING')]);
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<SalesQuoteList />);

    await user.click(await checkbox('QT-ONE'));
    expect(screen.getByRole('button', { name: REVIEW })).toBeEnabled();

    useQuotes([quote('qt-1', 'QT-ONE', 'REVIEW')]);
    await act(() => queryClient.invalidateQueries());

    await waitFor(() => expect(screen.getByRole('button', { name: REVIEW })).toBeDisabled());
    expect(await checkbox('QT-ONE')).not.toBeChecked();
  });
});

describe('견적 검토 모달: 버튼은 상세 쿼리의 상태를 본다', () => {
  const openAndCheck = async (quotationId: string) => {
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(
      <QuoteReviewModal id="m" onClose={() => {}} selectedQuotationId={quotationId} />,
    );
    await user.click(await screen.findByRole('button', { name: '재고 확인' }));
    await screen.findByText(/^재고 확인 일시/);
    return queryClient;
  };

  it('대기 견적이면 재고가 충분할 때 즉시 납품이 보인다', async () => {
    await openAndCheck('qt-002');
    expect(screen.getByRole('button', { name: DELIVER })).toBeInTheDocument();
  });

  it('대기 견적이면 재고가 부족할 때 생산에서 검토가 보인다', async () => {
    server.use(
      http.post(SALES_ENDPOINTS.INVENTORY_CHECK, () =>
        ok({
          items: [
            {
              itemId: 'item-1001',
              itemName: '모터 A',
              requiredQuantity: 100,
              inventoryQuantity: 10,
              shortageQuantity: 90,
              statusCode: 'SHORTAGE',
              productionRequired: true,
              inventoryCheckTime: '2026-11-12T01:00:00Z',
            },
          ],
        }),
      ),
    );
    await openAndCheck('qt-002');
    expect(screen.getByRole('link', { name: '생산관리에서 검토' })).toBeInTheDocument();
  });

  it.each([
    ['승인', 'qt-001'],
    ['검토중', 'qt-003'],
    ['반려', 'qt-004'],
  ])('%s 견적이면 즉시 납품도 생산에서 검토도 없다', async (_, quotationId) => {
    await openAndCheck(quotationId);
    expect(screen.queryByRole('button', { name: DELIVER })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '생산관리에서 검토' })).not.toBeInTheDocument();
  });

  it('모달이 열린 동안 다른 곳에서 검토 요청을 보내면 상세를 다시 받은 뒤 버튼이 사라진다', async () => {
    const queryClient = await openAndCheck('qt-002');
    expect(screen.getByRole('button', { name: DELIVER })).toBeInTheDocument();
    // 다른 화면(같은 로그인)에서 같은 견적을 검토 요청했고, 이 모달의 상세 쿼리가 다시 받는다(포커스 복귀 등)
    await postQuotationConfirm('qt-002');
    await act(() => queryClient.invalidateQueries());
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: DELIVER })).not.toBeInTheDocument(),
    );
  });
});

describe('견적 검토 모달 리뷰 반영', () => {
  it('즉시 납품 뒤 상세를 다시 못 받으면 오류 창을 닫아도 즉시 납품이 다시 보이지 않는다', async () => {
    const posts = countRequests('POST', SALES_ENDPOINTS.QUOTE_DELIVERY_PROCESS('qt-002'));
    const user = userEvent.setup();
    renderWithProviders(
      <QuoteReviewModal id="m" onClose={() => {}} selectedQuotationId="qt-002" />,
    );
    await user.click(await screen.findByRole('button', { name: '재고 확인' }));
    const deliver = await screen.findByRole('button', { name: DELIVER });

    // 납품은 성공하지만 그 뒤 상세 재조회가 실패한다. 캐시에는 납품 전(대기) 상세가 남는다
    server.use(
      http.get(SALES_ENDPOINTS.QUOTE_DETAIL('qt-002'), () => error('Failed to load', 500)),
    );
    await user.click(deliver);
    await user.click(await screen.findByRole('button', { name: '닫기' }));

    expect(screen.queryByRole('button', { name: DELIVER })).not.toBeInTheDocument();
    expect(posts()).toBe(1);
  });
});
