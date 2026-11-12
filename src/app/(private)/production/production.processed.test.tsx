import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { error, makePage, ok } from '@/mocks/utils';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { countRequests } from '@/test/countRequests';
import { useAuthStore } from '@/store/authStore';
import { PRODUCTION_ENDPOINTS } from './api/production.endpoints';
import OrdersTab from './components/tabs/OrdersTab';
import QuotationTab from './components/tabs/QuotationTab';
import PlannedOrdersTab from './components/tabs/PlannedOrdersTab';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/production',
}));

/**
 * 이미 처리된 건의 버튼 카드. 생산 탭의 여러 건 선택은 그릴 때 지금 목록에서 처리할 수 있는 행으로 거른다.
 * 전환, 확정, 자재 구매 요청은 PP 와 ALL_ADMIN 버튼이라 전체 관리자로 본다.
 */
beforeEach(() => {
  useAuthStore
    .getState()
    .setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role: 'ALL_ADMIN' });
});
afterEach(() => {
  useAuthStore.getState().clearUserInfo();
});

describe('MRP 순소요: 전환한 품목은 다시 전환하지 않는다', () => {
  // 기본 목 첫 페이지: idx 3, 6, 9(item-1003, 1006, 1009)만 미전환이다
  it('전체 선택은 미전환 품목만 넣는다', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(PRODUCTION_ENDPOINTS.MRP_CONVERT, async ({ request }) => {
        bodies.push(await request.json());
        return ok({ converted: true });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<OrdersTab />);

    await user.click(await screen.findByRole('checkbox', { name: '순소요 전체 선택' }));
    await user.click(screen.getByRole('button', { name: '계획 주문 전환' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      items: [{ itemId: 'item-1003' }, { itemId: 'item-1006' }, { itemId: 'item-1009' }],
    });
    expect(bodies[0]).toHaveProperty('items.length', 3);
  });

  it('전환 뒤 그 품목은 선택에서 빠지고 버튼을 다시 눌러도 두 번째 요청이 없다', async () => {
    const posts = countRequests('POST', PRODUCTION_ENDPOINTS.MRP_CONVERT);
    const user = userEvent.setup();
    renderWithProviders(<OrdersTab />);

    await user.click(await screen.findByRole('checkbox', { name: '너트 M10 선택' }));
    await user.click(screen.getByRole('button', { name: '계획 주문 전환' }));
    expect(
      await screen.findByRole('checkbox', { name: '너트 M10 계획 주문 전환됨(선택할 수 없음)' }),
    ).toBeDisabled();

    const button = screen.getByRole('button', { name: '계획 주문 전환' });
    await waitFor(() => expect(button).toBeDisabled());
    await user.click(button);
    expect(posts()).toBe(1);
  });
});

describe('생산 견적: 확정한 견적은 다음 확정에 가지 않는다', () => {
  const row = (quotationId: string, availableStatus: string) => ({
    quotationId,
    quotationNumber: quotationId.toUpperCase(),
    customerName: '한빛전자',
    productName: '모터 A',
    requestDate: '2026-01-10',
    dueDate: '2026-02-10',
    availableStatus,
  });
  const useQuotations = (rows: ReturnType<typeof row>[]) =>
    server.use(
      http.get(PRODUCTION_ENDPOINTS.QUOTATIONS, () =>
        ok({ content: rows, page: makePage(0, 10, rows.length) }),
      ),
    );

  it('고른 뒤 확인됨으로 바뀐 견적은 확정 요청에 없다', async () => {
    // 시뮬레이션 목에서 qt-007, qt-013 은 둘 다 생산 필요(PASS)라 MPS 를 만들 수 있다
    useQuotations([row('qt-007', 'UNCHECKED'), row('qt-013', 'UNCHECKED')]);
    const bodies: unknown[] = [];
    server.use(
      http.post(PRODUCTION_ENDPOINTS.QUOTATION_CONFIRM, async ({ request }) => {
        bodies.push(await request.json());
        return ok(null);
      }),
    );
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<QuotationTab />);

    await user.click(await screen.findByRole('checkbox', { name: 'QT-007 선택' }));
    await user.click(screen.getByRole('checkbox', { name: 'QT-013 선택' }));

    // 다른 곳에서 qt-007 을 먼저 확정했다
    useQuotations([row('qt-007', 'CHECKED'), row('qt-013', 'UNCHECKED')]);
    await act(() => queryClient.invalidateQueries());
    await screen.findByRole('checkbox', { name: 'QT-007 가용재고 확인 완료(선택할 수 없음)' });

    await user.click(screen.getByRole('button', { name: '시뮬레이션' }));
    await user.click(await screen.findByRole('button', { name: 'MPS 생성하기' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ quotationIds: ['qt-013'] });
  });
});

describe('계획 주문: 상태가 바뀐 주문은 선택에서 빠진다', () => {
  const row = (mrpRunId: string, quotationNumber: string, status: string) => ({
    mrpRunId,
    quotationNumber,
    itemId: `item-${mrpRunId}`,
    itemName: '베어링 B',
    quantity: 10,
    status,
    procurementStartDate: '2026-01-10',
    expectedArrivalDate: '2026-02-10',
  });
  const usePlanned = (rows: ReturnType<typeof row>[]) =>
    server.use(
      http.get(PRODUCTION_ENDPOINTS.MRP_PLANNED_ORDERS_LIST, () =>
        ok({ content: rows, page: makePage(0, 10, rows.length) }),
      ),
    );

  it('고른 주문이 다시 받은 목록에서 대기로 바뀌면 자재 구매 요청이 잠긴다', async () => {
    usePlanned([row('mrp-a', 'QT-A', 'REJECTED')]);
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<PlannedOrdersTab />);

    const before = within(await screen.findByRole('row', { name: /QT-A/ }));
    await user.click(before.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: '자재 구매 요청' })).toBeEnabled();

    // 다른 곳에서 같은 주문을 구매 요청했다
    usePlanned([row('mrp-a', 'QT-A', 'PENDING')]);
    await act(() => queryClient.invalidateQueries());

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '자재 구매 요청' })).toBeDisabled(),
    );
  });
});

describe('생산 탭 리뷰 반영', () => {
  const quote = (quotationId: string) => ({
    quotationId,
    quotationNumber: quotationId.toUpperCase(),
    customerName: '한빛전자',
    productName: '모터 A',
    requestDate: '2026-01-10',
    dueDate: '2026-02-10',
    availableStatus: 'UNCHECKED',
  });
  const useQuotations = () =>
    server.use(
      http.get(PRODUCTION_ENDPOINTS.QUOTATIONS, () =>
        ok({ content: [quote('qt-007'), quote('qt-013')], page: makePage(0, 10, 2) }),
      ),
    );

  it('MRP 전환 뒤 목록을 다시 못 받으면 전환 버튼이 잠기고 두 번째 요청이 없다', async () => {
    const posts = countRequests('POST', PRODUCTION_ENDPOINTS.MRP_CONVERT);
    const user = userEvent.setup();
    renderWithProviders(<OrdersTab />);

    await user.click(await screen.findByRole('checkbox', { name: '너트 M10 선택' }));
    server.use(http.get(PRODUCTION_ENDPOINTS.MRP_ORDERS, () => error('Failed to load', 500)));
    await user.click(screen.getByRole('button', { name: '계획 주문 전환' }));
    expect(
      await screen.findByText('순소요 목록을 불러오는 중 오류가 발생했습니다.'),
    ).toBeInTheDocument();

    const button = screen.getByRole('button', { name: '계획 주문 전환' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(posts()).toBe(1);
  });

  it('견적 확정 뒤 목록을 다시 못 받으면 시뮬레이션 버튼이 잠긴다', async () => {
    useQuotations();
    server.use(http.post(PRODUCTION_ENDPOINTS.QUOTATION_CONFIRM, () => ok(null)));
    const user = userEvent.setup();
    renderWithProviders(<QuotationTab />);

    await user.click(await screen.findByRole('checkbox', { name: 'QT-007 선택' }));
    await user.click(screen.getByRole('button', { name: '시뮬레이션' }));
    server.use(http.get(PRODUCTION_ENDPOINTS.QUOTATIONS, () => error('Failed to load', 500)));
    await user.click(await screen.findByRole('button', { name: 'MPS 생성하기' }));

    await waitFor(() => expect(screen.getByRole('button', { name: '시뮬레이션' })).toBeDisabled());
  });

  it('MPS 확정은 시뮬레이션한 견적을 보낸다(시뮬레이션 중에 선택을 바꿔도)', async () => {
    useQuotations();
    const bodies: unknown[] = [];
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      // 응답을 붙잡았다가 기본 목으로 넘긴다
      http.post(PRODUCTION_ENDPOINTS.QUOTATION_SIMULATE, async () => {
        await gate;
      }),
      http.post(PRODUCTION_ENDPOINTS.QUOTATION_CONFIRM, async ({ request }) => {
        bodies.push(await request.json());
        return ok(null);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<QuotationTab />);

    await user.click(await screen.findByRole('checkbox', { name: 'QT-007 선택' }));
    await user.click(screen.getByRole('button', { name: '시뮬레이션' }));
    await user.click(screen.getByRole('checkbox', { name: 'QT-013 선택' }));
    release();
    await user.click(await screen.findByRole('button', { name: 'MPS 생성하기' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ quotationIds: ['qt-007'] });
  });

  it('계획 주문 목록을 다시 못 받으면 고른 주문이 있어도 자재 구매 요청이 잠긴다', async () => {
    server.use(
      http.get(PRODUCTION_ENDPOINTS.MRP_PLANNED_ORDERS_LIST, () =>
        ok({
          content: [
            {
              mrpRunId: 'mrp-a',
              quotationNumber: 'QT-A',
              itemId: 'item-a',
              itemName: '베어링 B',
              quantity: 10,
              status: 'REJECTED',
              procurementStartDate: '2026-01-10',
              expectedArrivalDate: '2026-02-10',
            },
          ],
          page: makePage(0, 10, 1),
        }),
      ),
    );
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<PlannedOrdersTab />);

    await user.click(await screen.findByRole('checkbox', { name: 'QT-A 베어링 B 선택' }));
    expect(screen.getByRole('checkbox', { name: '계획 주문 전체 선택' })).toBeChecked();
    expect(screen.getByRole('button', { name: '자재 구매 요청' })).toBeEnabled();

    server.use(
      http.get(PRODUCTION_ENDPOINTS.MRP_PLANNED_ORDERS_LIST, () => error('Failed to load', 500)),
    );
    await act(() => queryClient.invalidateQueries());

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '자재 구매 요청' })).toBeDisabled(),
    );
  });
});
