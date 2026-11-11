import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { SALES_ENDPOINTS } from '@/app/types/api';
import ko from '@/i18n/messages/ko.json';
import salesKo from '@/i18n/messages/sales/ko.json';
import { CustomerAccountError, postCustomer } from './sales.api';
import { customerKeys } from './sales.keys';
import type { CustomerData } from './types/NewCustomerModalType';
import NewCustomerModal from './components/modals/NewCustomerModal';

/**
 * 영업 매출 분석 실패 카드(2026-11-11)의 고객 등록 응답.
 * 게이트웨이 SdController.java:210 은 ApiResponse<CreateAuthUserResultDto> 를 준다. 봉투는 한 겹이고
 * data 는 eventId, transactionId, success, userId, failureReason(CreateAuthUserResultDto.java:8-12)이다.
 */
const gatewayCreated = {
  status: 200,
  success: true,
  message: '고객사 등록이 완료되었습니다.',
  data: {
    eventId: 'evt-1',
    transactionId: 'tx-1',
    success: true,
    userId: 'user-1',
    failureReason: null,
  },
};

const body: CustomerData = {
  companyName: '신규상사',
  businessNumber: '123-45-67890',
  ceoName: '홍길동',
  contactPhone: '02-000-0000',
  contactEmail: 'a@b.c',
  zipCode: '00000',
  address: '서울',
  detailAddress: '',
  manager: { name: '김담당', mobile: '010-0000-0000', email: 'm@b.c' },
  note: '',
};

const t = salesKo.newCustomer;
const LIST_KEY = customerKeys.list({ page: 0, size: 10 });

/** 필수 칸만 채워 고객 등록을 누른다. 고객 목록 캐시를 미리 넣어 무효화 여부를 본다 */
const submitForm = async () => {
  const onClose = vi.fn();
  const { queryClient } = renderWithProviders(<NewCustomerModal id="m" onClose={onClose} />);
  queryClient.setQueryData(LIST_KEY, { data: [], pageData: null });
  await userEvent.type(screen.getByLabelText(t.companyName), '신규상사');
  await userEvent.type(screen.getByLabelText(t.phone), '02-000-0000');
  await userEvent.type(screen.getByLabelText(t.managerName), '김담당');
  await userEvent.type(screen.getByLabelText(t.email), 'm@b.c');
  await userEvent.click(screen.getByRole('button', { name: t.submit }));
  return { onClose, queryClient, listKey: LIST_KEY };
};

// 바깥 봉투는 성공인데 담당자 계정 생성이 실패한 결과(CreateAuthUserResultDto 의 success, failureReason)
const innerFailure = {
  ...gatewayCreated,
  data: {
    ...gatewayCreated.data,
    success: false,
    userId: null,
    failureReason: 'duplicated email',
  },
};

describe('고객 등록 응답 모양', () => {
  it('기본 목은 게이트웨이 모양(봉투 한 겹, userId 문자열, customerCode 없음)을 준다', async () => {
    const created = await postCustomer(body);
    expect(typeof created?.userId).toBe('string');
    expect(created?.success).toBe(true);
    expect(created !== undefined && 'customerCode' in created).toBe(false);
    expect(created !== undefined && 'data' in created).toBe(false);
  });

  it('게이트웨이 모양 응답이면 성공 토스트, 모달 닫힘, 고객 목록 무효화', async () => {
    server.use(http.post(SALES_ENDPOINTS.CUSTOMERS_LIST, () => HttpResponse.json(gatewayCreated)));
    const { onClose, queryClient, listKey } = await submitForm();
    expect(await screen.findByText(t.success)).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true));
  });

  it('안쪽 success 가 false 면 서버 오류로 거절한다(실패 이유는 화면에 그대로 싣지 않는다)', async () => {
    server.use(http.post(SALES_ENDPOINTS.CUSTOMERS_LIST, () => HttpResponse.json(innerFailure)));
    const failed = postCustomer(body);
    await expect(failed).rejects.toBeInstanceOf(CustomerAccountError);
    await expect(failed).rejects.toMatchObject({ kind: 'server', message: 'duplicated email' });
  });

  it('안쪽 success 가 false 면 목록 확인 안내, 모달과 입력 유지, 고객 목록은 다시 받는다', async () => {
    server.use(http.post(SALES_ENDPOINTS.CUSTOMERS_LIST, () => HttpResponse.json(innerFailure)));
    const { onClose, queryClient, listKey } = await submitForm();
    // 다시 시도를 권하지 않는다. 고객사는 이미 저장됐을 수 있어 다시 누르면 중복된다
    expect(await screen.findByText(t.accountError)).toBeInTheDocument();
    expect(
      screen.queryByText(t.error.replace('{message}', ko.errors.server)),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(t.success)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(t.companyName)).toHaveValue('신규상사');
    // 고객사 행은 저장됐을 수 있다(계정 생성만 실패). 목록에 보여야 같은 고객을 또 등록하지 않는다
    await waitFor(() => expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true));
  });

  it('보통 실패(500)는 오류 토스트, 모달 유지, 고객 목록은 그대로', async () => {
    server.use(
      http.post(SALES_ENDPOINTS.CUSTOMERS_LIST, () =>
        HttpResponse.json({ status: 500, success: false, message: 'x' }, { status: 500 }),
      ),
    );
    const { onClose, queryClient, listKey } = await submitForm();
    expect(
      await screen.findByText(t.error.replace('{message}', ko.errors.server)),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(false);
  });

  it('바깥 봉투가 성공이고 data 가 빠지면(게이트웨이 NON_NULL) 성공으로 본다', async () => {
    const { data: _omit, ...envelope } = gatewayCreated;
    server.use(http.post(SALES_ENDPOINTS.CUSTOMERS_LIST, () => HttpResponse.json(envelope)));
    await expect(postCustomer(body)).resolves.toBeUndefined();
  });
});
