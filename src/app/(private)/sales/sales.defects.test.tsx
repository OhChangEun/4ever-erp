import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { SALES_ENDPOINTS } from '@/app/types/api';
import type { CustomerDetail } from './types/SalesCustomerDetailType';
import CustomerEditModal from './components/modals/CustomerEditModal';
import QuoteReviewModal from './components/modals/QuoteReviewModal';
import QuoteDetailModal from './components/modals/QuoteDetailModal';
import NewOrderModal from './components/modals/NewOrderModal';
import SalesCustomerList from './components/tabs/SalesCustomerList';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/sales',
}));

const ok = (data: unknown = null) =>
  HttpResponse.json({ status: 200, success: true, message: 'OK', data });

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

describe('영업 화면 결함', () => {
  it('고객 수정에서 비활성을 고르면 서버 코드 INACTIVE 로 간다', async () => {
    let body: unknown = null;
    server.use(
      http.patch(SALES_ENDPOINTS.EDIT_CUSTOMER('cus-1'), async ({ request }) => {
        body = await request.json();
        return ok({ data: customer });
      }),
    );
    const onClose = vi.fn();
    renderWithProviders(<CustomerEditModal id="m" onClose={onClose} editFormData={customer} />);
    await userEvent.selectOptions(screen.getByLabelText('상태'), 'INACTIVE');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(body).toMatchObject({ statusCode: 'INACTIVE' });
  });

  it('고객 목록의 비활성 필터는 status=INACTIVE 로 조회한다', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get(SALES_ENDPOINTS.CUSTOMERS_LIST, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('status'));
        return ok({
          content: [],
          page: { number: 0, size: 10, totalElements: 0, totalPages: 0, hasNext: false },
        });
      }),
    );
    renderWithProviders(<SalesCustomerList />);
    await userEvent.click(await screen.findByRole('combobox', { name: '전체 상태' }));
    await userEvent.click(await screen.findByRole('option', { name: '비활성' }));
    await waitFor(() => expect(seen).toContain('INACTIVE'));
  });

  it('재고 확인 표는 행마다 그 품목의 부족 여부를 보인다', async () => {
    server.use(
      http.post(SALES_ENDPOINTS.INVENTORY_CHECK, () =>
        ok({
          items: [
            {
              itemId: 'a',
              itemName: '모터 A',
              requiredQuantity: 10,
              inventoryQuantity: 20,
              shortageQuantity: 0,
              statusCode: 'AVAILABLE',
              productionRequired: false,
              inventoryCheckTime: '2026-11-10T00:00:00',
            },
            {
              itemId: 'b',
              itemName: '기어 B',
              requiredQuantity: 10,
              inventoryQuantity: 3,
              shortageQuantity: 7,
              statusCode: 'SHORTAGE',
              productionRequired: true,
              inventoryCheckTime: '2026-11-10T00:00:00',
            },
          ],
        }),
      ),
    );
    renderWithProviders(<QuoteReviewModal id="m" onClose={vi.fn()} selectedQuotationId="q-1" />);
    await userEvent.click(await screen.findByRole('button', { name: '재고 확인' }));
    const motor = (await screen.findByRole('cell', { name: '모터 A' })).closest('tr');
    const gear = screen.getByRole('cell', { name: '기어 B' }).closest('tr');
    if (!motor || !gear) throw new Error('행이 없다');
    expect(within(motor).getByText('충족')).toBeInTheDocument();
    expect(within(gear).getByText('부족')).toBeInTheDocument();
  });

  it('견적 상세와 검토의 대표자 칸은 "대표이사"로 적힌다(값은 ceoName)', async () => {
    renderWithProviders(<QuoteDetailModal id="m" onClose={vi.fn()} selectedQuotationId="q-1" />);
    expect(await screen.findByText('대표이사:')).toBeInTheDocument();
    expect(screen.queryByText('담당자:')).not.toBeInTheDocument();
  });

  it('견적 요청이 실패하면 성공 토스트를 띄우지 않고 입력을 남긴다', async () => {
    server.use(
      http.post(SALES_ENDPOINTS.NEW_ORDER, () =>
        HttpResponse.json({ status: 500, success: false, message: 'x' }, { status: 500 }),
      ),
    );
    renderWithProviders(<NewOrderModal id="m" onClose={vi.fn()} />);
    const product = await screen.findByRole('option', { name: /모터 A/ });
    const select = product.closest('select');
    if (!select) throw new Error('품목 선택이 없다');
    await userEvent.selectOptions(select, product);
    const note = screen.getByRole('textbox', { name: '비고' });
    await userEvent.type(note, '급함');
    await userEvent.click(screen.getByRole('button', { name: '견적 요청 등록' }));
    expect(await screen.findByText(/견적 요청 중 오류/)).toBeInTheDocument();
    expect(screen.queryByText('신규 견적 요청이 등록되었습니다.')).not.toBeInTheDocument();
    expect(note).toHaveValue('급함');
  });
});
