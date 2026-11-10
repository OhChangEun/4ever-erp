import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import FinanceOverview from './components/overview/FinanceOverview';
import FinanceTabs from './components/tabs/FinanceTabs';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/finance',
}));

describe('재무 화면 영어(i18n 2)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      userInfo: { id: 1, name: 'admin', email: 'a@b.c', role: 'ALL_ADMIN' },
    });
  });
  afterEach(() => {
    useAuthStore.setState({ userInfo: null });
  });

  it('탭 이름과 매출 전표 목록이 영어', async () => {
    renderWithProviders(<FinanceTabs />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Sales invoices' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purchase invoices' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sales invoices' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request settlement' })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: 'Invoice no.' })).toBeInTheDocument();
  });

  it('재무 현황의 제목, 표, 요약 문장이 영어', async () => {
    renderWithProviders(<FinanceOverview />, { locale: 'en' });
    const monthly = await screen.findByRole('region', { name: 'Monthly sales and purchases' });
    await within(monthly).findByText(/12-month sales/);
    await userEvent.click(within(monthly).getByRole('button', { name: 'View as table' }));
    expect(
      within(monthly).getByRole('table', { name: 'Monthly sales and purchases table' }),
    ).toBeInTheDocument();

    const aging = await screen.findByRole('region', { name: 'Receivables aging' });
    await within(aging).findByText(/of which overdue/);
    const table = within(aging).getByRole('table', { name: 'Receivables aging table' });
    expect(within(table).getByText('Over 90 days')).toBeInTheDocument();
  });
});
