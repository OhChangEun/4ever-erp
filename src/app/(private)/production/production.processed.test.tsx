import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { error, makePage, ok } from '@/mocks/utils';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { countRequests } from '@/test/countRequests';
import { mockApi, quoteNumberOf } from '@/test/mockApi';
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
  // 기본 목 첫 페이지: idx 3, 6, 9(품목표의 알루미늄 판 item-wh-004, 패킹 item-wh-008, 하우징 item-wh-011)만 미전환이다
  // (카드 "데모 데이터 채우기", MRP 품목이 재고 품목표 번호를 쓴다)
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
      items: [
        { quotationId: 'qt-005', itemId: 'item-wh-004' },
        { quotationId: 'qt-009', itemId: 'item-wh-008' },
        { quotationId: 'qt-013', itemId: 'item-wh-011' },
      ],
    });
    expect(bodies[0]).toHaveProperty('items.length', 3);
  });

  it('전환 뒤 그 품목은 선택에서 빠지고 버튼을 다시 눌러도 두 번째 요청이 없다', async () => {
    const posts = countRequests('POST', PRODUCTION_ENDPOINTS.MRP_CONVERT);
    const user = userEvent.setup();
    renderWithProviders(<OrdersTab />);

    await user.click(await screen.findByRole('checkbox', { name: '알루미늄 판 선택' }));
    await user.click(screen.getByRole('button', { name: '계획 주문 전환' }));
    expect(
      await screen.findByRole('checkbox', { name: '알루미늄 판 계획 주문 전환됨(선택할 수 없음)' }),
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

/** 카드 "반려 견적과 등록 반영" 리뷰 A1. 기본 목으로 만든 견적을 검토 요청하고 생산 화면에서 확정까지 간다 */
describe('생산 견적: 로그인이 만든 견적의 시뮬레이션은 지금 재고로 본다', () => {
  const SALES = '/business/sd/quotations';
  const motor = (quantity: number) => ({ itemId: 'item-1001', quantity, unitPrice: 12000 });
  const bearing = (quantity: number) => ({ itemId: 'item-1002', quantity, unitPrice: 8000 });
  /** 견적(모터 A 재고 120, 베어링 B 재고 20)을 만들어 검토를 요청하고, 생산 화면에서 시뮬레이션한다 */
  const simulateNewQuote = async (...items: Array<ReturnType<typeof motor>>) => {
    await mockApi('POST', SALES, { body: { items, note: '' } });
    await mockApi('POST', `${SALES}/confirm`, { body: { quotationId: 'qt-017' } });
    const number = await quoteNumberOf('qt-017');
    const user = userEvent.setup();
    renderWithProviders(<QuotationTab />);
    // 번호순 맨 끝(2쪽)
    await user.click(await screen.findByRole('button', { name: '2' }));
    await user.click(await screen.findByRole('checkbox', { name: `${number} 선택` }));
    await user.click(screen.getByRole('button', { name: '시뮬레이션' }));
    const create = await screen.findByRole('button', { name: 'MPS 생성하기' });
    return { user, number, create, dialog: within(screen.getByRole('dialog')) };
  };

  it('재고보다 많이 요청하면 모자란 수량이 보이고 MPS 를 만들면 확인됨이 된다', async () => {
    const { user, number, create, dialog } = await simulateNewQuote(motor(200));
    expect(dialog.getByText('200개')).toBeInTheDocument();
    expect(dialog.getByText('120개')).toBeInTheDocument();
    expect(dialog.getByText('80개')).toBeInTheDocument();
    expect(create).toBeEnabled();
    await user.click(create);
    expect(
      await screen.findByRole('checkbox', {
        name: `${number} 가용재고 확인 완료(선택할 수 없음)`,
      }),
    ).toBeInTheDocument();
  });

  it('재고 안이면 만들 것이 없어 MPS 생성이 잠긴다', async () => {
    const { create, dialog } = await simulateNewQuote(motor(100));
    expect(dialog.getByText('0개')).toBeInTheDocument();
    expect(create).toBeDisabled();
  });

  it.each([
    ['둘째', [motor(1), bearing(30)]],
    ['첫째', [bearing(30), motor(1)]],
  ])(
    '%s 품목(베어링 B)만 모자라면 그 품목의 수량과 사유가 보이고 BOM 이 없어 MPS 생성이 잠긴다',
    async (_, items) => {
      const { user, number, create, dialog } = await simulateNewQuote(...items);
      expect(dialog.getAllByText('베어링 B')).not.toHaveLength(0);
      expect(dialog.queryByText('모터 A')).not.toBeInTheDocument();
      for (const quantity of ['30개', '20개', '10개'])
        expect(dialog.getByText(quantity)).toBeInTheDocument();
      expect(dialog.getAllByText('BOM이 등록되지 않은 품목')).not.toHaveLength(0);
      expect(create).toBeDisabled();
      await user.keyboard('{Escape}');
      expect(await screen.findByRole('checkbox', { name: `${number} 선택` })).toBeEnabled();
    },
  );

  it('모자란 품목이 모터 A 면 순서와 상관없이 모터 A 다', async () => {
    const { create, dialog } = await simulateNewQuote(bearing(1), motor(200));
    expect(dialog.getByText('80개')).toBeInTheDocument();
    expect(create).toBeEnabled();
  });

  it('재고를 옮겨 모자라지면 MPS 를 만들 수 있다', async () => {
    await mockApi('POST', '/scm-pp/iv/stock-transfers', {
      body: {
        itemId: 'item-1001',
        fromWarehouseId: 'wh-001',
        toWarehouseId: 'wh-002',
        stockQuantity: 50,
        uomName: 'EA',
        reason: '재배치',
      },
    });
    const { create, dialog } = await simulateNewQuote(motor(100));
    expect(dialog.getByText('70개')).toBeInTheDocument();
    expect(dialog.getByText('30개')).toBeInTheDocument();
    expect(create).toBeEnabled();
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

    await user.click(await screen.findByRole('checkbox', { name: '알루미늄 판 선택' }));
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
