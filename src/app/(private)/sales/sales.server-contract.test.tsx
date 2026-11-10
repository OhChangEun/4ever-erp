import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { SALES_ENDPOINTS } from '@/app/types/api';
import type { Locale } from '@/i18n/locale';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';
import salesKo from '@/i18n/messages/sales/ko.json';
import salesEn from '@/i18n/messages/sales/en.json';
import { getOrderList } from './sales.api';
import QuoteDetailModal from './components/modals/QuoteDetailModal';
import SalesOrderDetailModal from './components/modals/SalesOrderDetailModal';
import SalesOrderList from './components/tabs/SalesOrderList';
import SalesQuoteList from './components/tabs/SalesQuoteList';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/sales',
}));

/**
 * 영업 서버 계약 카드(2026-11-11). 게이트웨이 SdController 와 DTO 를 기준으로
 * 주문 날짜 파라미터, 견적 상태 APPROVAL, 단위 글자를 확인한다.
 */

const ok = (data: unknown) =>
  HttpResponse.json({ status: 200, success: true, message: 'OK', data });

const quoteDetail = (statusCode: string, uomName = 'EA') => ({
  quotationId: 'q-1',
  quotationNumber: 'QT-2026-001',
  quotationDate: '2026-01-10',
  dueDate: '2026-02-01',
  statusCode,
  customerName: '한빛전자',
  ceoName: '박대표',
  items: [
    { itemId: 'item-1', itemName: '모터 A', quantity: 100, uomName, unitPrice: 12000, amount: 1 },
  ],
  totalAmount: 1,
});

const orderDetail = (uonName: string) => ({
  order: {
    salesOrderId: 'so-1',
    salesOrderNumber: 'SO-2026-001',
    orderDate: '2026-01-12',
    dueDate: '2026-02-05',
    statusCode: 'IN_PRODUCTION',
    totalAmount: 1,
  },
  customer: {
    customerId: 1,
    customerName: '한빛전자',
    customerCode: 'CUS-001',
    customerBaseAddress: '서울',
    customerDetailAddress: '5층',
    manager: { managerName: '김영업', managerPhone: '010', managerEmail: 'a@b.c' },
  },
  items: [
    { itemId: 'item-1', itemName: '모터 A', quantity: 100, uonName, unitPrice: 12000, amount: 1 },
  ],
  note: '',
});

describe('주문 날짜 필터 파라미터', () => {
  const marchFilter = {
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    keyword: '',
    type: '',
    status: 'ALL',
    page: 0,
    size: 10,
  };

  it('게이트웨이가 받는 startDate, endDate 로 보내고 start, end 는 보내지 않는다', async () => {
    const seen: URLSearchParams[] = [];
    server.use(
      http.get(SALES_ENDPOINTS.ORDERS_LIST, ({ request }) => {
        seen.push(new URL(request.url).searchParams);
        return ok({
          content: [],
          page: { number: 0, size: 10, totalElements: 0, totalPages: 0, hasNext: false },
        });
      }),
    );
    await getOrderList(marchFilter);
    expect(seen).toHaveLength(1);
    expect(seen[0].get('startDate')).toBe('2026-03-01');
    expect(seen[0].get('endDate')).toBe('2026-03-31');
    expect(seen[0].has('start')).toBe(false);
    expect(seen[0].has('end')).toBe(false);
  });

  it('기본 목은 startDate, endDate 로 주문일을 거른다(옛 이름이면 거르지 않아 실패)', async () => {
    const { data } = await getOrderList(marchFilter);
    expect(data).toEqual([]);
    const january = await getOrderList({
      ...marchFilter,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
    expect(january.data.map((order) => order.salesOrderNumber)).toEqual(['SO-2026-001']);
  });
});

const locales: readonly Locale[] = ['ko', 'en'];

describe.each(locales)('견적 상세 상태와 단위 (%s)', (locale) => {
  const messages = locale === 'ko' ? ko : en;
  const salesMessages = locale === 'ko' ? salesKo : salesEn;
  const unitLabel = locale === 'ko' ? '개' : 'pcs';

  const renderQuote = () =>
    renderWithProviders(<QuoteDetailModal id="m" onClose={() => {}} selectedQuotationId="q-1" />, {
      locale,
    });

  it('게이트웨이 상태 코드 APPROVAL 을 거절하지 않고 승인으로 보인다', async () => {
    server.use(http.get(SALES_ENDPOINTS.QUOTE_DETAIL('q-1'), () => ok(quoteDetail('APPROVAL'))));
    renderQuote();
    expect(await screen.findByText('QT-2026-001')).toBeInTheDocument();
    expect(screen.getByText(messages.status.APPROVAL)).toBeInTheDocument();
    expect(screen.queryByText(salesMessages.quote.loadError)).not.toBeInTheDocument();
  });

  it('APPROVED 도 그대로 승인으로 보인다', async () => {
    server.use(http.get(SALES_ENDPOINTS.QUOTE_DETAIL('q-1'), () => ok(quoteDetail('APPROVED'))));
    renderQuote();
    expect(await screen.findByText(messages.status.APPROVED)).toBeInTheDocument();
  });

  it('모르는 상태 코드는 계속 형식 오류로 막는다(검증을 풀지 않았다)', async () => {
    server.use(http.get(SALES_ENDPOINTS.QUOTE_DETAIL('q-1'), () => ok(quoteDetail('APPROVE'))));
    renderQuote();
    expect(await screen.findByText(salesMessages.quote.loadError)).toBeInTheDocument();
  });

  it('견적 품목 단위 EA 를 단위 글자로 보인다', async () => {
    server.use(
      http.get(SALES_ENDPOINTS.QUOTE_DETAIL('q-1'), () => ok(quoteDetail('APPROVED', 'EA'))),
    );
    renderQuote();
    const row = (await screen.findByText('모터 A')).closest('tr');
    expect(row).not.toBeNull();
    if (!row) return;
    expect(within(row).getByRole('cell', { name: unitLabel })).toBeInTheDocument();
    expect(within(row).queryByRole('cell', { name: 'EA' })).not.toBeInTheDocument();
  });

  it('견적 품목의 모르는 단위 코드는 숨기지 않고 코드 그대로 보인다', async () => {
    server.use(
      http.get(SALES_ENDPOINTS.QUOTE_DETAIL('q-1'), () => ok(quoteDetail('APPROVED', 'DRUM'))),
    );
    renderQuote();
    expect(await screen.findByRole('cell', { name: 'DRUM' })).toBeInTheDocument();
  });

  it('주문 품목 단위 EA 를 단위 글자로 보인다', async () => {
    server.use(http.get(SALES_ENDPOINTS.ORDER_DETAIL('so-1'), () => ok(orderDetail('EA'))));
    renderWithProviders(
      <SalesOrderDetailModal id="m" onClose={() => {}} selectedSalesOrderId="so-1" />,
      { locale },
    );
    const row = (await screen.findByText('모터 A')).closest('tr');
    expect(row).not.toBeNull();
    if (!row) return;
    expect(within(row).getByRole('cell', { name: unitLabel })).toBeInTheDocument();
    expect(within(row).queryByRole('cell', { name: 'EA' })).not.toBeInTheDocument();
  });
});

/**
 * 리뷰 P2. 날짜 필터가 실제로 걸리면서, 2쪽 이상에서 날짜나 상태를 바꾸면 결과가 1쪽뿐이어도
 * 옛 쪽 번호로 요청해 빈 표가 보였다. 필터를 바꾸면 1쪽(page=0)으로 돌아가야 한다.
 * api 는 page 0 을 보내지 않는다(게이트웨이 기본값 0). 그래서 없으면 '0' 으로 읽는다.
 */
const listCases = [
  {
    name: '주문',
    endpoint: SALES_ENDPOINTS.ORDERS_LIST,
    renderList: () => <SalesOrderList />,
    statusCode: 'DELIVERED',
  },
  {
    name: '견적',
    endpoint: SALES_ENDPOINTS.QUOTES_LIST,
    renderList: () => <SalesQuoteList />,
    statusCode: 'REJECTED',
  },
] as const;

describe.each(listCases)(
  '$name 목록 필터를 바꾸면 1쪽으로',
  ({ endpoint, renderList, statusCode }) => {
    const recordRequests = () => {
      const seen: URLSearchParams[] = [];
      server.use(
        http.get(endpoint, ({ request }) => {
          seen.push(new URL(request.url).searchParams);
          return ok({
            content: [],
            page: { number: 0, size: 10, totalElements: 30, totalPages: 3, hasNext: true },
          });
        }),
      );
      const last = () => seen.at(-1);
      const pageOf = (params: URLSearchParams | undefined) => params?.get('page') ?? '0';
      return { last, pageOf };
    };

    const goToPage2 = async (
      pageOf: (p: URLSearchParams | undefined) => string,
      last: () => URLSearchParams | undefined,
    ) => {
      await userEvent.click(await screen.findByRole('button', { name: ko.ui.pagination.next }));
      await waitFor(() => expect(pageOf(last())).toBe('1'));
    };

    const pickDate = async (trigger: string, day: number) => {
      await userEvent.click(screen.getByRole('button', { name: trigger }));
      const dialog = screen.getByRole('dialog');
      await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: '연도' }), '2026');
      // 월 선택지 값은 0부터(2 = 3월)
      await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: '월' }), '2');
      await userEvent.click(
        within(dialog).getByRole('button', { name: new RegExp(`2026년 3월 ${day}일`) }),
      );
    };

    it('2쪽에서 시작일과 종료일을 고르면 page=0 으로 startDate, endDate 를 보낸다', async () => {
      const { last, pageOf } = recordRequests();
      renderWithProviders(renderList());
      await goToPage2(pageOf, last);

      await pickDate(ko.calendar.startDate, 10);
      await waitFor(() => expect(last()?.get('startDate')).toBe('2026-03-10'));
      expect(pageOf(last())).toBe('0');

      await goToPage2(pageOf, last);
      await pickDate(ko.calendar.endDate, 20);
      await waitFor(() => expect(last()?.get('endDate')).toBe('2026-03-20'));
      expect(last()?.get('startDate')).toBe('2026-03-10');
      expect(pageOf(last())).toBe('0');
    });

    it('2쪽에서 상태를 바꾸면 page=0 으로 보낸다', async () => {
      const { last, pageOf } = recordRequests();
      renderWithProviders(renderList());
      await goToPage2(pageOf, last);

      await userEvent.click(screen.getByRole('combobox', { name: salesKo.common.allStatuses }));
      await userEvent.click(screen.getByRole('option', { name: ko.status[statusCode] }));
      await waitFor(() => expect(last()?.get('status')).toBe(statusCode));
      expect(pageOf(last())).toBe('0');
    });
  },
);
