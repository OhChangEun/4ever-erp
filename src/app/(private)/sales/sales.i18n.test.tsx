import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/i18n/messages/en.json';
import ko from '@/i18n/messages/ko.json';
import { http } from 'msw';
import { ok } from '@/mocks/utils';
import { SALES_ENDPOINTS } from '@/app/types/api';
import { server } from '@/test/msw-server';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { ModalProvider } from '@/app/components/common/modal/ModalProvider';
import { ToastProvider } from '@/app/components/common/toast/ToastProvider';
import { useAuthStore } from '@/store/authStore';
import type { Locale } from '@/i18n/locale';
import SalesClient from './SalesClient';
import SalesLayout from './layout';
import SalesQuoteList from './components/tabs/SalesQuoteList';
import SalesCustomerList from './components/tabs/SalesCustomerList';
import SalesChart from './components/tabs/SalesChart';
import DashboardLayout from '../dashboard/layout';
import { ActionCard } from '../dashboard/components/ActionCard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/sales',
}));

// 레이아웃 시험용. 앱 Providers 는 MSW 켜기와 개발 도구까지 들고 있어 테스트와 같은 것만 남긴다
vi.mock('@/app/(private)/_RouteProviders', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <ModalProvider>{children}</ModalProvider>
      </ToastProvider>
    </QueryClientProvider>
  ),
}));

/** 루트 레이아웃처럼 공통 메시지만 준다. 도메인 메시지는 라우트 레이아웃이 붙여야 한다 */
const renderUnderRoot = (ui: ReactNode, locale: Locale = 'en') =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'en' ? en : ko}
      timeZone="Asia/Seoul"
    >
      {ui}
    </NextIntlClientProvider>,
  );

/** 행 안의 버튼. 체크박스가 든 행에서 찾는다 */
const rowButton = (cell: HTMLElement, name: string) => {
  const row = cell.closest('tr');
  if (!row) throw new Error('행을 찾지 못했다');
  return within(row).getByRole('button', { name });
};

const loginAs = (role: string) =>
  useAuthStore.getState().setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role });

describe('영업 화면 영어(i18n 8)', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
  });

  it('탭 이름과 통계 카드 제목이 영어, 건수에 단위 "건"이 붙지 않는다', async () => {
    loginAs('ALL_ADMIN');
    renderWithProviders(<SalesClient />, { locale: 'en' });
    const metrics = await screen.findByRole('region', { name: 'Metrics' });
    expect(within(metrics).getByText('Sales')).toBeInTheDocument();
    expect(within(metrics).getByText('New orders')).toBeInTheDocument();
    // 매출은 재무 월별 손익의 이번 달 8억의 7/30, 신규 주문은 주문 목록 1건(카드 "목 데이터 현실성")
    expect(within(metrics).getByText('₩186,670,000')).toBeInTheDocument();
    expect(within(metrics).getByText('1')).toBeInTheDocument();
    expect(within(metrics).queryByText(/건/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quotes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Customers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sales analytics' })).toBeInTheDocument();
  });

  it('한국어 탭과 통계 카드는 예전과 같다(신규 주문 1건)', async () => {
    loginAs('ALL_ADMIN');
    renderWithProviders(<SalesClient />);
    const metrics = await screen.findByRole('region', { name: '지표' });
    expect(within(metrics).getByText('매출')).toBeInTheDocument();
    expect(within(metrics).getByText('1건')).toBeInTheDocument();
    expect(within(metrics).getByText('₩186,670,000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '견적 관리' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '매출 분석' })).toBeInTheDocument();
  });

  it('고객사는 견적, 주문 탭과 견적 건수 카드만 영어로 본다', async () => {
    loginAs('CUSTOMER_ADMIN');
    renderWithProviders(<SalesClient />, { locale: 'en' });
    const metrics = await screen.findByRole('region', { name: 'Metrics' });
    expect(within(metrics).getByText('Quotes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Orders' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Customers' })).not.toBeInTheDocument();
  });

  it('견적 목록의 표 머리, 상태 필터, 검색 기준, 상세 모달이 영어', async () => {
    renderWithProviders(<SalesQuoteList />, { locale: 'en' });
    expect(await screen.findByRole('columnheader', { name: 'Quote no.' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Due date' })).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: 'Select QT-2026-001' });
    expect(checkbox).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request quote review' })).toBeDisabled();
    await userEvent.click(screen.getByRole('combobox', { name: 'All statuses' }));
    expect(screen.getByRole('option', { name: 'In review' })).toBeInTheDocument();
    // 목 견적 목록이 상태마다 한 행이라(서버 계약 2 리뷰) QT-2026-001 행의 버튼을 누른다
    await userEvent.click(rowButton(checkbox, 'Details'));
    const dialog = await screen.findByRole('dialog', { name: 'Quote details - QT-2026-001' });
    expect(await within(dialog).findByText('Quote items')).toBeInTheDocument();
    expect(within(dialog).getByRole('columnheader', { name: 'Unit price' })).toBeInTheDocument();
  });

  it('한국어 견적 목록은 예전과 같다', async () => {
    renderWithProviders(<SalesQuoteList />);
    expect(await screen.findByRole('columnheader', { name: '견적번호' })).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: 'QT-2026-001 선택' });
    expect(checkbox).toBeInTheDocument();
    await userEvent.click(rowButton(checkbox, '상세'));
    expect(
      await screen.findByRole('dialog', { name: '견적서 상세보기-QT-2026-001' }),
    ).toBeInTheDocument();
  });

  it('고객 목록의 거래 건수는 영어 복수형, 한국어는 예전과 같다', async () => {
    const { unmount } = renderWithProviders(<SalesCustomerList />, { locale: 'en' });
    expect(await screen.findByText('14 orders')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Sales total' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add customer' })).toBeInTheDocument();
    unmount();
    renderWithProviders(<SalesCustomerList />);
    expect(await screen.findByText('14건')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '거래액' })).toBeInTheDocument();
  });

  // 남은 표시 결함 3 카드: 짧은 금액은 compactWon 하나(예전 toShortWon 은 ₩5M, ₩0.1억)
  it('매출 분석의 제목과 제품 비중 금액이 영어(5M), 한국어는 500만', async () => {
    // 기본 목은 요청 기간(오늘 기준)의 주마다 값을 만들어 날마다 금액이 바뀐다(카드 "목 데이터 현실성").
    // 이 테스트는 금액 글자 형식을 보므로 예전 기본 목과 같은 고정 응답을 준다
    server.use(
      http.get(SALES_ENDPOINTS.ANALYTICS, () =>
        ok({
          period: {
            start: '2026-01-01',
            end: '2026-01-31',
            weekStart: '2026-01-01',
            weekEnd: '2026-01-07',
            weekCount: 5,
          },
          trend: [{ year: 2026, month: 1, week: 1, sale: 1200000, orderCount: 12 }],
          trendScale: { sale: { min: 1000000, max: 2000000 }, orderCount: { min: 10, max: 20 } },
          productShare: [
            { productCode: 'P-1001', productName: '모터 A', sale: 5000000, saleShare: 40 },
          ],
          topCustomers: [
            {
              customerNumber: 'CUS-001',
              customerName: '한빛전자',
              orderCount: 5,
              sale: 8000000,
              active: true,
            },
          ],
        }),
      ),
    );
    const { unmount } = renderWithProviders(<SalesChart />, { locale: 'en' });
    expect(await screen.findByText('40% (5M)')).toBeInTheDocument();
    // 주마다 한 점이다(PR #127). 남은 한국어 문자열 카드에서 월별 → 주별
    expect(screen.getByRole('heading', { name: 'Weekly sales trend' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sales by top customer' })).toBeInTheDocument();
    unmount();
    renderWithProviders(<SalesChart />);
    expect(await screen.findByText('40% (500만)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '제품별 매출 비중' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '주별 매출 추이' })).toBeInTheDocument();
  });
});

describe('영업 레이아웃과 대시보드에서 여는 영업 모달(i18n 8)', () => {
  it('영업 레이아웃이 영업 메시지를 준다. 고객 상세 모달 안 문구도 영어', async () => {
    renderUnderRoot(
      <SalesLayout>
        <SalesCustomerList />
      </SalesLayout>,
    );
    // 영어 메시지는 받은 뒤에 바뀐다
    await userEvent.click(await screen.findByRole('button', { name: 'Details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Customer details' });
    expect(await within(dialog).findByText('Contact info')).toBeInTheDocument();
  });

  it('대시보드 레이아웃은 영업 메시지도 준다. 빠른 작업에서 연 견적 요청 모달이 영어', async () => {
    renderUnderRoot(
      <DashboardLayout>
        <ActionCard actionKey="newQuote" icon="ri-file-text-line" color="blue" href="/sales" />
      </DashboardLayout>,
    );
    await userEvent.click(await screen.findByRole('link', { name: /New quote/ }));
    const dialog = await screen.findByRole('dialog', { name: 'New quote request' });
    expect(await within(dialog).findByText('Order items')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Submit quote request' }),
    ).toBeInTheDocument();
  });

  it('한국어 대시보드에서 연 견적 요청 모달은 예전과 같다', async () => {
    renderUnderRoot(
      <DashboardLayout>
        <ActionCard actionKey="newQuote" icon="ri-file-text-line" color="blue" href="/sales" />
      </DashboardLayout>,
      'ko',
    );
    await userEvent.click(await screen.findByRole('link', { name: /신규 견적서 작성/ }));
    const dialog = await screen.findByRole('dialog', { name: '신규 견적 요청' });
    expect(await within(dialog).findByText('주문 품목')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '견적 요청 등록' })).toBeInTheDocument();
  });
});
