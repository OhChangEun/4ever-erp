import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { SALES_ENDPOINTS } from '@/app/types/api';
import type { CustomerDetail } from '@/app/(private)/sales/types/SalesCustomerDetailType';
import CustomerEditModal from './CustomerEditModal';

const customer: CustomerDetail = {
  customerId: 'cus-1',
  customerNumber: 'C-001',
  customerName: '기존상사',
  ceoName: '홍길동',
  businessNumber: '123-45-67890',
  statusCode: 'ACTIVE',
  customerPhone: '02-000-0000',
  customerEmail: 'old@b.c',
  baseAddress: '서울',
  detailAddress: '1층',
  manager: { managerName: '김담당', managerPhone: '010-0000-0000', managerEmail: 'm@b.c' },
  totalOrders: 3,
  totalTransactionAmount: 1000,
  note: '',
};

describe('고객 수정 모달', () => {
  it('입력하면 값이 바뀌고, 저장하면 바뀐 값이 가고, 성공해야 닫힌다', async () => {
    let body: unknown = null;
    server.use(
      http.patch(SALES_ENDPOINTS.EDIT_CUSTOMER('cus-1'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          status: 200,
          success: true,
          message: 'OK',
          data: { data: customer },
        });
      }),
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CustomerEditModal id="m" onClose={onClose} editFormData={customer} />);

    const name = screen.getByDisplayValue('기존상사');
    await user.clear(name);
    await user.type(name, '새상사');
    expect(screen.getByDisplayValue('새상사')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(body).toMatchObject({ customerName: '새상사', ceoName: '홍길동' });
  });

  it('저장이 실패하면 모달과 입력이 남는다', async () => {
    server.use(
      http.patch(SALES_ENDPOINTS.EDIT_CUSTOMER('cus-1'), async () => {
        await delay(20);
        return HttpResponse.json({ status: 500, success: false, message: 'x' }, { status: 500 });
      }),
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CustomerEditModal id="m" onClose={onClose} editFormData={customer} />);
    const name = screen.getByDisplayValue('기존상사');
    await user.clear(name);
    await user.type(name, '새상사');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(
      await screen.findByText(/고객 수정 중 오류가 발생했습니다/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('새상사')).toBeInTheDocument();
  });
});
