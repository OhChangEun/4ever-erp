import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { API_BASE_URL } from '@/app/types/api';
import FinanceOverview from './FinanceOverview';

describe('재무 현황(시각화 4)', () => {
  it('월별 요약 문장과 표로 보기(12행)', async () => {
    renderWithProviders(<FinanceOverview />);
    const monthly = await screen.findByRole('region', { name: '월별 매출과 매입' });
    await within(monthly).findByText(/12개월 매출/);
    await userEvent.click(within(monthly).getByRole('button', { name: '표로 보기' }));
    const table = within(monthly).getByRole('table', { name: '월별 매출과 매입 표' });
    expect(within(table).getAllByRole('row')).toHaveLength(13);
  });

  it('미수금 aging 표는 구간 5개와 기한 지난 금액 문장', async () => {
    renderWithProviders(<FinanceOverview />);
    const aging = await screen.findByRole('region', { name: '미수금 경과' });
    await within(aging).findByText(/기한 지난 금액/);
    const table = within(aging).getByRole('table', { name: '미수금 경과 표' });
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(within(table).getByText('90일 초과')).toBeInTheDocument();
  });

  it('불러오지 못하면 오류를 보인다', async () => {
    server.use(
      http.get(`${API_BASE_URL}/business/fcm/analytics/monthly`, () =>
        HttpResponse.json({ status: 500, success: false, message: 'x' }, { status: 500 }),
      ),
      http.get(`${API_BASE_URL}/business/fcm/analytics/ar-aging`, () =>
        HttpResponse.json({ status: 500, success: false, message: 'x' }, { status: 500 }),
      ),
    );
    renderWithProviders(<FinanceOverview />);
    await waitFor(() =>
      expect(screen.getByText('월별 매출과 매입을 불러오지 못했습니다.')).toBeInTheDocument(),
    );
    expect(screen.getByText('미수금 경과를 불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('월별 데이터가 비면 차트를 그리지 않는다', async () => {
    server.use(
      http.get(`${API_BASE_URL}/business/fcm/analytics/monthly`, () =>
        HttpResponse.json({ status: 200, success: true, message: 'OK', data: { months: [] } }),
      ),
    );
    renderWithProviders(<FinanceOverview />);
    await screen.findByText('표시할 월별 데이터가 없습니다.');
    expect(screen.queryByRole('img', { name: '월별 매출과 매입 차트' })).not.toBeInTheDocument();
  });
});
