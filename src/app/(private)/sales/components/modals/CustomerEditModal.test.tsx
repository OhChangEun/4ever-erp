import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { SALES_ENDPOINTS } from '@/app/types/api';
import type { CustomerDetail } from '@/app/(private)/sales/types/SalesCustomerDetailType';
import { patchCustomer } from '../../sales.api';
import type { CustomerEditData } from '../../types/CustomerEditModalType';
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

/**
 * 영업 매출 분석 실패 카드(2026-11-11). 고객 수정 요청의 담당자 키는 name, mobile, email 이다.
 * FE 커밋 2e17263(#136 고객 수정 백엔드 테스트 완료)이 실서버 테스트 뒤 managerName 등에서 이 이름으로 바꿨다.
 * 게이트웨이의 CustomerUpdateRequestDto, CustomerManagerDto 는 참조가 없는 DTO 라 근거로 쓰지 않는다
 * (컨트롤러는 Map 으로 받아 그대로 넘긴다, SdController.java:311, SdHttpServiceImpl.java:196).
 * 컨트롤러 Swagger 예시(SdController.java:309)는 managerName 등이지만 Map 을 그대로 넘겨 강제력이 없다.
 * 2e17263 실서버 테스트를 우선한다. 업스트림 PATCH DTO 확인 전(verified=false).
 */
describe('고객 수정 담당자 키', () => {
  it('담당자를 바꿔 저장하면 manager 를 name, mobile, email 로 보낸다', async () => {
    let body: unknown = null;
    server.use(
      http.patch(SALES_ENDPOINTS.EDIT_CUSTOMER('cus-1'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ status: 200, success: true, message: 'OK', data: {} });
      }),
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CustomerEditModal id="m" onClose={onClose} editFormData={customer} />);
    const managerName = screen.getByLabelText('담당자명');
    await user.clear(managerName);
    await user.type(managerName, '새담당');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(body).toMatchObject({
      manager: { name: '새담당', mobile: '010-0000-0000', email: 'm@b.c' },
    });
    expect(body).not.toMatchObject({ manager: { managerName: expect.anything() } });
  });

  it('기본 목은 받은 name, mobile, email 을 응답의 managerName, managerPhone, managerEmail 로 돌려준다', async () => {
    const data: CustomerEditData = {
      customerName: '새상사',
      ceoName: '홍길동',
      businessNumber: '123',
      customerPhone: '02',
      customerEmail: 'a@b.c',
      baseAddress: '서울',
      detailAddress: '',
      statusCode: 'ACTIVE',
      manager: { name: '새담당', mobile: '010-9', email: 'n@b.c' },
      note: '',
    };
    const updated = await patchCustomer('cus-1', data);
    expect(updated.data.manager).toEqual({
      managerName: '새담당',
      managerPhone: '010-9',
      managerEmail: 'n@b.c',
    });
  });
});
