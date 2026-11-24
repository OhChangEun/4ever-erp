import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { error, ok } from '@/mocks/utils';
import { SALES_ENDPOINTS } from '@/app/types/api';
import { server } from '@/test/msw-server';
import { countRequests } from '@/test/countRequests';
import { renderWithProviders } from '@/test/render';
import { mockBrowserLocale } from '@/test/browserLocale';
import QuoteReviewModal from './QuoteReviewModal';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

/** 재고 확인 시각은 브라우저 언어(de-DE, 24시간)가 아니라 화면 언어를 따른다 */
describe('견적 검토 모달 재고 확인 시각', () => {
  afterEach(() => vi.restoreAllMocks());

  it('영어 화면이면 영어 시각(AM, PM)', async () => {
    mockBrowserLocale('de-DE');
    renderWithProviders(
      <QuoteReviewModal id="m" onClose={() => {}} selectedQuotationId="qt-001" />,
      {
        locale: 'en',
      },
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Check stock' }));
    expect(await screen.findByText(/^Checked at: \d{2}:\d{2} (AM|PM)$/)).toBeInTheDocument();
  });

  it('한국어 화면은 예전과 같다(오전, 오후)', async () => {
    mockBrowserLocale('de-DE');
    renderWithProviders(
      <QuoteReviewModal id="m" onClose={() => {}} selectedQuotationId="qt-001" />,
    );
    await userEvent.click(await screen.findByRole('button', { name: '재고 확인' }));
    expect(
      await screen.findByText(/^재고 확인 일시: (오전|오후) \d{2}:\d{2}$/),
    ).toBeInTheDocument();
  });
});

describe('견적 검토 모달 재고 확인 표', () => {
  it('필요 수량과 재고 수량에 자리 구분 쉼표', async () => {
    server.use(
      http.post(SALES_ENDPOINTS.INVENTORY_CHECK, () =>
        ok({
          items: [
            {
              itemId: 'item-1001',
              itemName: '모터 A',
              requiredQuantity: 1200,
              inventoryQuantity: 15000,
              shortageQuantity: 0,
              statusCode: 'AVAILABLE',
              productionRequired: false,
              inventoryCheckTime: '2026-11-11T01:00:00Z',
            },
          ],
        }),
      ),
    );
    renderWithProviders(
      <QuoteReviewModal id="m" onClose={() => {}} selectedQuotationId="qt-001" />,
    );
    await userEvent.click(await screen.findByRole('button', { name: '재고 확인' }));
    expect(await screen.findByRole('cell', { name: '1,200' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '15,000' })).toBeInTheDocument();
  });
});

/** 카드 "반려 견적과 등록 반영" 리뷰 A2. 예전에는 요청을 보내면서 바로 생산으로 넘어가 늦은 쓰기와 실패가 안 보였다 */
describe('생산관리에서 검토는 검토 요청이 성공한 뒤에만 넘어간다', () => {
  const REVIEW = '생산관리에서 검토';
  // 재고가 모자란 기본 견적
  const open = async (onClose: () => void) => {
    push.mockReset();
    const user = userEvent.setup();
    const view = renderWithProviders(
      <QuoteReviewModal id="m" onClose={onClose} selectedQuotationId="qt-014" />,
    );
    await user.click(await screen.findByRole('button', { name: '재고 확인' }));
    return { user, button: await screen.findByRole('button', { name: REVIEW }), ...view };
  };
  /** 응답을 붙잡았다가 기본 목으로 넘긴다 */
  const hold = () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(SALES_ENDPOINTS.QUOTE_CONFIRM, async () => {
        await gate;
      }),
    );
    return () => release();
  };

  it('응답 전에는 남아 있고 버튼이 잠기며, 성공하면 닫고 생산으로 간다. 요청은 한 번', async () => {
    const release = hold();
    const posts = countRequests('POST', SALES_ENDPOINTS.QUOTE_CONFIRM);
    const onClose = vi.fn();
    const { user, button } = await open(onClose);

    await user.dblClick(button);
    await waitFor(() => expect(posts()).toBe(1));
    expect(screen.getByRole('button', { name: REVIEW })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: REVIEW }));
    expect(push).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    release();
    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith('/production'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(posts()).toBe(1);
  });

  it('실패하면 넘어가지 않고 오류를 보이며 재고 확인 결과가 남고, 다시 눌러 성공하면 간다', async () => {
    const onClose = vi.fn();
    const { user, button } = await open(onClose);
    server.use(
      http.post(SALES_ENDPOINTS.QUOTE_CONFIRM, () => error('Failed to confirm quote', 500), {
        once: true,
      }),
    );

    await user.click(button);
    expect(await screen.findByText(/검토 요청 중 오류가 발생했습니다/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('row', { name: /모터 A 350 120 부족/ })).toBeInTheDocument();

    const again = screen.getByRole('button', { name: REVIEW });
    expect(again).toBeEnabled();
    await user.click(again);
    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith('/production'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('응답 전에 모달을 닫으면 성공해도 화면을 옮기지 않는다', async () => {
    const release = hold();
    const posts = countRequests('POST', SALES_ENDPOINTS.QUOTE_CONFIRM);
    const onClose = vi.fn();
    const { user, button, unmount, queryClient } = await open(onClose);
    await user.click(button);
    await waitFor(() => expect(posts()).toBe(1));
    unmount();
    release();
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    expect(push).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
