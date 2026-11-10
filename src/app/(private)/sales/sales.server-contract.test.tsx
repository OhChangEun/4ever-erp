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
import axios from '@/lib/axiosInstance';
import type { ApiResponse } from '@/app/types/api';
import { getAnalytics, getOrderDetail, getOrderList, getQuoteList } from './sales.api';
import { QUOTE_STATUS_OPTIONS } from './constant';
import type { Quote } from './types/SalesQuoteListType';
import QuoteDetailModal from './components/modals/QuoteDetailModal';
import SalesOrderDetailModal from './components/modals/SalesOrderDetailModal';
import SalesOrderList from './components/tabs/SalesOrderList';
import SalesQuoteList from './components/tabs/SalesQuoteList';
import SalesChart from './components/tabs/SalesChart';

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

// 고객은 게이트웨이 OrderCustomerDto.java:11 모양(customerId 문자열, customerCode 없음). 서버 계약 2 카드에서 바꿨다
const backendCustomer = {
  customerId: 'cus-001',
  customerName: '한빛전자',
  customerBaseAddress: '서울',
  customerDetailAddress: '5층',
  manager: { managerName: '김영업', managerPhone: '010', managerEmail: 'a@b.c' },
};

const orderDetail = (uonName: string, customer: Record<string, unknown> = backendCustomer) => ({
  order: {
    salesOrderId: 'so-1',
    salesOrderNumber: 'SO-2026-001',
    orderDate: '2026-01-12',
    dueDate: '2026-02-05',
    statusCode: 'IN_PRODUCTION',
    totalAmount: 1,
  },
  customer,
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

/**
 * 영업 서버 계약 2 카드(2026-11-11). 견적 목록 승인 필터는 게이트웨이 값 APPROVAL 을 보낸다
 * (SdController.java:101, QuotationStatus.java:13). 기본 목은 상태가 같은 행만 돌려준다.
 */
describe('견적 목록 승인 필터', () => {
  it('승인을 고르면 status=APPROVAL 로 보내고 승인 견적이 보인다', async () => {
    const seen: URLSearchParams[] = [];
    const record = ({ request }: { request: Request }) => {
      const url = new URL(request.url);
      if (url.pathname === new URL(SALES_ENDPOINTS.QUOTES_LIST, 'http://localhost').pathname)
        seen.push(url.searchParams);
    };
    server.events.on('request:start', record);
    try {
      renderWithProviders(<SalesQuoteList />);
      expect(await screen.findByText('QT-2026-001')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('combobox', { name: salesKo.common.allStatuses }));
      await userEvent.click(screen.getByRole('option', { name: ko.status.APPROVAL }));
      await waitFor(() => expect(seen.at(-1)?.get('status')).toBe('APPROVAL'));
      expect(seen.some((params) => params.get('status') === 'APPROVED')).toBe(false);
      expect(await screen.findByText('QT-2026-001')).toBeInTheDocument();
    } finally {
      server.events.removeListener('request:start', record);
    }
  });

  it('기본 목은 status 로 거른다(옛 값 APPROVED 면 승인 견적이 없다)', async () => {
    const approval = await getQuoteList({ status: 'APPROVAL', page: 0, size: 10 });
    expect(approval.data.map((quote) => quote.quotationNumber)).toEqual(['QT-2026-001']);
    // 옛 값은 타입(QuoteStatusFilter)이 막으므로 axios 로 직접 보낸다
    const approved = await axios.get<ApiResponse<{ content: Quote[] }>>(
      SALES_ENDPOINTS.QUOTES_LIST,
      { params: { status: 'APPROVED', page: 0, size: 10 } },
    );
    expect(approved.data.data.content).toEqual([]);
    const all = await getQuoteList({ status: 'ALL', page: 0, size: 10 });
    expect(all.data).toHaveLength(QUOTE_STATUS_OPTIONS.length - 1);
  });

  it.each(QUOTE_STATUS_OPTIONS.filter((code) => code !== 'ALL'))(
    '기본 목은 %s 필터에도 행이 있다(데모에서 표가 비지 않는다)',
    async (status) => {
      const { data } = await getQuoteList({ status, page: 0, size: 10 });
      expect(data.length).toBeGreaterThan(0);
      expect(data.every((quote) => quote.statusCode === status)).toBe(true);
    },
  );
});

/**
 * 영업 서버 계약 2 카드(2026-11-11). 주문 상세 고객은 게이트웨이 OrderCustomerDto.java:11 과
 * CustomerSummaryDto.java 모두 customerId 가 문자열이고 customerCode 가 없다. 응답은 프록시라
 * (SdHttpServiceImpl.java:292) 업스트림 실제 값은 사본으로 확정 못 한다. 두 DTO 가 같은 모양이라 그쪽에 맞춘다.
 */
describe.each(locales)('주문 상세 고객 모양 (%s)', (locale) => {
  const salesMessages = locale === 'ko' ? salesKo : salesEn;

  const renderOrder = (customer: Record<string, unknown>) => {
    server.use(
      http.get(SALES_ENDPOINTS.ORDER_DETAIL('so-1'), () => ok(orderDetail('EA', customer))),
    );
    renderWithProviders(
      <SalesOrderDetailModal id="m" onClose={() => {}} selectedSalesOrderId="so-1" />,
      { locale },
    );
  };

  it('customerId 문자열, customerCode 없는 게이트웨이 모양을 받아 고객 정보를 보인다', async () => {
    renderOrder(backendCustomer);
    expect(await screen.findByText('SO-2026-001')).toBeInTheDocument();
    expect(screen.getByText('한빛전자')).toBeInTheDocument();
    expect(screen.getByText('김영업')).toBeInTheDocument();
    expect(screen.queryByText(salesMessages.orderDetail.loadError)).not.toBeInTheDocument();
  });

  it('옛 모양(customerId 숫자)은 형식 오류로 막는다', async () => {
    renderOrder({ ...backendCustomer, customerId: 1, customerCode: 'CUS-001' });
    expect(await screen.findByText(salesMessages.orderDetail.loadError)).toBeInTheDocument();
    // 화면 오류가 응답 형식 때문인지 API 에서 따로 확인한다
    await expect(getOrderDetail('so-1')).rejects.toMatchObject({ kind: 'invalidShape' });
  });

  it('고객명이 빠지면 계속 형식 오류로 막는다(다른 필드는 풀지 않았다)', async () => {
    const { customerName: _omit, ...withoutName } = backendCustomer;
    renderOrder(withoutName);
    expect(await screen.findByText(salesMessages.orderDetail.loadError)).toBeInTheDocument();
    await expect(getOrderDetail('so-1')).rejects.toMatchObject({ kind: 'invalidShape' });
  });
});

describe('주문 상세 기본 목', () => {
  it('고객을 게이트웨이 모양(customerId 문자열, customerCode 없음)으로 준다', async () => {
    const { customer } = await getOrderDetail('so-001');
    expect(typeof customer.customerId).toBe('string');
    expect('customerCode' in customer).toBe(false);
  });
});

/**
 * 영업 서버 계약 2 카드(2026-11-11). 매출 분석은 게이트웨이가 타입 SalesAnalyticsResponseDto 로 받아
 * 다시 직렬화한다(SdHttpServiceImpl.java:67-75). 상위 고객은 TopCustomerDto.java:15 의 customerNumber 만 있고
 * customerCode 는 나갈 수 없다.
 */
const analytics = (topCustomer: Record<string, unknown>) => ({
  period: {
    start: '2026-01-01',
    end: '2026-01-31',
    weekStart: '2026-01-01',
    weekEnd: '2026-01-07',
    weekCount: 5,
  },
  trend: [{ year: 2026, month: 1, week: 1, sale: 1, orderCount: 1 }],
  trendScale: { sale: { min: 0, max: 1 }, orderCount: { min: 0, max: 1 } },
  productShare: [{ productCode: 'P-1', productName: '모터 A', sale: 1, saleShare: 100 }],
  topCustomers: [topCustomer],
});

const gatewayTopCustomer = {
  customerNumber: 'CUS-001',
  customerName: '한빛전자',
  orderCount: 5,
  sale: 8000000,
  active: true,
};

describe('매출 분석 상위 고객 이름', () => {
  const range = { startDate: '2026-01-01', endDate: '2026-01-31' };

  it('게이트웨이 모양(customerNumber)을 받아 차트에 고객 데이터가 있다', async () => {
    server.use(http.get(SALES_ENDPOINTS.ANALYTICS, () => ok(analytics(gatewayTopCustomer))));
    renderWithProviders(<SalesChart />);
    expect(await screen.findByText('모터 A')).toBeInTheDocument();
    expect(screen.queryByText(salesKo.chart.customerEmpty)).not.toBeInTheDocument();
  });

  it('옛 이름 customerCode 만 오면 형식 오류로 막는다', async () => {
    const { customerNumber: _omit, ...rest } = gatewayTopCustomer;
    server.use(
      http.get(SALES_ENDPOINTS.ANALYTICS, () =>
        ok(analytics({ ...rest, customerCode: 'CUS-001' })),
      ),
    );
    await expect(getAnalytics(range)).rejects.toMatchObject({ kind: 'invalidShape' });
  });

  it('기본 목은 customerNumber 를 주고 customerCode 는 없다', async () => {
    const { topCustomers } = await getAnalytics(range);
    expect(topCustomers.length).toBeGreaterThan(0);
    expect(topCustomers.every((customer) => typeof customer.customerNumber === 'string')).toBe(
      true,
    );
    expect(topCustomers.some((customer) => 'customerCode' in customer)).toBe(false);
  });
});
