import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { SALES_ENDPOINTS } from '@/app/types/api';
import CustomerDetailModal from './CustomerDetailModal';

describe('고객 상세 모달', () => {
  it('조회 오류 창을 닫아도 화면이 깨지지 않고 안내가 남는다', async () => {
    server.use(
      http.get(SALES_ENDPOINTS.CUSTOMER_DETAIL('c-1'), () =>
        HttpResponse.json({ status: 404, success: false, message: '없음' }, { status: 404 }),
      ),
    );
    renderWithProviders(
      <CustomerDetailModal id="m" onClose={() => undefined} selectedCustomerId="c-1" />,
    );
    await screen.findByText(
      '고객 상세 데이터를 불러오는 중 오류가 발생했습니다.',
      {},
      { timeout: 5000 },
    );
    await userEvent.click(screen.getByRole('button', { name: /닫기|확인/ }));
    expect(await screen.findByText('고객 상세 데이터를 불러오지 못했습니다.')).toBeInTheDocument();
  });
});
