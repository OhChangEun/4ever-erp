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
import { ORDER_STATUS_OPTIONS, QUOTE_STATUS_OPTIONS } from './constant';
import QuoteReviewModal from './components/modals/QuoteReviewModal';
import SalesQuoteList from './components/tabs/SalesQuoteList';
import SalesOrderList from './components/tabs/SalesOrderList';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/sales',
}));

const locales: readonly Locale[] = ['ko', 'en'];
const ok = (data: unknown = null) =>
  HttpResponse.json({ status: 200, success: true, message: 'OK', data });

const listCases = [
  {
    name: '견적',
    endpoint: SALES_ENDPOINTS.QUOTES_LIST,
    renderList: () => <SalesQuoteList />,
    rows: QUOTE_STATUS_OPTIONS.filter((code) => code !== 'ALL').map((statusCode) => ({
      quotationId: `q-${statusCode}`,
      quotationNumber: `QT-${statusCode}`,
      customerName: '한빛전자',
      managerName: '김영업',
      quotationDate: '2026-11-10',
      dueDate: '2026-11-20',
      totalAmount: 1000,
      statusCode,
    })),
  },
  {
    name: '주문',
    endpoint: SALES_ENDPOINTS.ORDERS_LIST,
    renderList: () => <SalesOrderList />,
    rows: ORDER_STATUS_OPTIONS.filter((code) => code !== 'ALL').map((statusCode) => ({
      salesOrderId: `o-${statusCode}`,
      salesOrderNumber: `SO-${statusCode}`,
      customerName: '한빛전자',
      manager: { managerName: '김영업', managerPhone: '', managerEmail: '' },
      orderDate: '2026-11-10',
      dueDate: '2026-11-20',
      totalAmount: 1000,
      statusCode,
    })),
  },
];

describe.each(locales)('영업 화면 남은 결함 (%s)', (locale) => {
  const messages = locale === 'ko' ? ko : en;
  const salesMessages = locale === 'ko' ? salesKo : salesEn;
  const successMessage =
    locale === 'ko'
      ? '견적 QT-2026-001의 즉시 납품 처리가 완료되었습니다.'
      : 'Immediate delivery completed for quote QT-2026-001.';

  const requestDelivery = async () => {
    // 즉시 납품은 대기 견적에만 보인다(이미 처리된 건의 버튼 카드). 기본 목 상세는 승인 견적이라 대기로 준다
    server.use(
      http.get(SALES_ENDPOINTS.QUOTE_DETAIL('q-1'), () =>
        ok({
          quotationId: 'q-1',
          quotationNumber: 'QT-2026-001',
          quotationDate: '2026-01-10',
          dueDate: '2026-02-01',
          statusCode: 'PENDING',
          customerName: '한빛전자',
          ceoName: '박대표',
          items: [
            {
              itemId: 'item-1001',
              itemName: '모터 A',
              quantity: 100,
              uomName: 'EA',
              unitPrice: 12000,
              amount: 1200000,
            },
          ],
          totalAmount: 12500000,
        }),
      ),
    );
    renderWithProviders(<QuoteReviewModal id="m" onClose={vi.fn()} selectedQuotationId="q-1" />, {
      locale,
    });
    await userEvent.click(
      await screen.findByRole('button', { name: salesMessages.quoteReview.check }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: salesMessages.quoteReview.deliver }),
    );
  };

  it('즉시 납품 성공 알림은 상태 숫자 대신 번역 문구와 견적번호를 보인다', async () => {
    server.use(http.post(SALES_ENDPOINTS.QUOTE_DELIVERY_PROCESS('q-1'), () => ok()));
    await requestDelivery();
    const toast = screen.getByRole('status');
    expect(await within(toast).findByText(successMessage)).toBeInTheDocument();
    expect(toast).not.toHaveTextContent('200');
  });

  it('즉시 납품 실패는 기존 오류 알림만 보인다', async () => {
    server.use(
      http.post(SALES_ENDPOINTS.QUOTE_DELIVERY_PROCESS('q-1'), () =>
        HttpResponse.json(
          { status: 500, success: false, message: 'Delivery rejected' },
          { status: 500 },
        ),
      ),
    );
    await requestDelivery();
    const toast = screen.getByRole('status');
    const errorPrefix = salesMessages.quoteReview.deliverError.replace('{message}', '').trim();
    await waitFor(() => expect(toast).toHaveTextContent(errorPrefix));
    expect(toast).not.toHaveTextContent(successMessage);
    expect(screen.getByRole('button', { name: salesMessages.quoteReview.deliver })).toBeEnabled();
  });

  it.each(listCases)(
    '$name 필터와 표의 상태 문구가 같고 조회에는 코드를 보낸다',
    async ({ endpoint, renderList, rows }) => {
      const seen: (string | null)[] = [];
      server.use(
        http.get(endpoint, ({ request }) => {
          const status = new URL(request.url).searchParams.get('status');
          seen.push(status);
          const content = rows.filter((row) => status === 'ALL' || row.statusCode === status);
          return ok({
            content,
            page: {
              number: 0,
              size: 10,
              totalElements: content.length,
              totalPages: 1,
              hasNext: false,
            },
          });
        }),
      );
      renderWithProviders(renderList(), { locale });
      const table = await screen.findByRole('table');
      const filter = screen.getByRole('combobox', { name: salesMessages.common.allStatuses });
      await waitFor(() => expect(seen).toContain('ALL'));

      for (const row of rows) {
        const label = messages.status[row.statusCode];
        expect(within(table).getByRole('cell', { name: label })).toBeInTheDocument();
      }

      for (const row of rows) {
        const label = messages.status[row.statusCode];
        await userEvent.click(filter);
        await userEvent.click(screen.getByRole('option', { name: label }));
        await waitFor(() => expect(seen).toContain(row.statusCode));
        expect(await within(table).findByRole('cell', { name: label })).toBeInTheDocument();
      }

      await userEvent.click(filter);
      await userEvent.click(screen.getByRole('option', { name: salesMessages.common.allStatuses }));
      expect(filter).toHaveTextContent(salesMessages.common.allStatuses);
      expect(
        seen.every((code) => code === 'ALL' || rows.some((row) => row.statusCode === code)),
      ).toBe(true);
    },
  );
});
