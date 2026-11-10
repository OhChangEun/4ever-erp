import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { PROFILE_ENDPOINTS } from '@/app/types/api';
import { toDateKey, toISOString } from '@/app/utils/date';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/msw-server';
import { useAuthStore } from '@/store/authStore';
import { PURCHASE_ENDPOINTS } from '../../api/purchase.endpoints';
import PurchaseRequestFormModal from './PurchaseRequestFormModal';

const ok = (data: unknown) =>
  HttpResponse.json({ status: 200, success: true, message: 'OK', data });

const profile = {
  name: '김영업',
  employeeNumber: 'EMP-42',
  position: '사원',
  hireDate: '2025-01-01',
  serviceYears: '1',
  email: 'sales@everp.local',
  phoneNumber: '010-1234-5678',
  address: '서울',
};

async function fillRequest() {
  const user = userEvent.setup();
  const itemName = screen.getByPlaceholderText('품목명 입력');
  await user.type(itemName, '영업용 소모품');
  await user.type(screen.getByPlaceholderText('수량'), '2');
  await user.type(screen.getByPlaceholderText('EA, KG 등'), 'EA');
  await user.type(screen.getByPlaceholderText('단가'), '5000');
  await user.type(screen.getByPlaceholderText('공급업체 입력'), '거래처');
  await user.click(screen.getByRole('button', { name: '납기일 선택' }));
  await user.click(screen.getByRole('button', { current: 'date' }));

  const row = itemName.closest('tr');
  if (!row) throw new Error('구매 품목 행이 없습니다.');
  const purpose = within(row).getAllByRole('cell').at(7);
  if (!purpose) throw new Error('사용 목적 입력란이 없습니다.');
  await user.click(within(purpose).getByRole('button'));
  await user.type(screen.getByPlaceholderText('사용 목적'), '고객 상담');
  await user.click(screen.getByRole('button', { name: '확인' }));
  return user;
}

function submitForm() {
  const form = screen.getByPlaceholderText('품목명 입력').closest('form');
  if (!form) throw new Error('구매 요청 폼이 없습니다.');
  fireEvent.submit(form);
}

describe('구매 요청의 로그인 사용자 부서', () => {
  beforeEach(() => {
    useAuthStore.getState().setUserInfo({
      id: 42,
      name: '김영업',
      email: 'sales@everp.local',
      role: 'SD_ADMIN',
    });
  });

  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
  });

  it.each([
    { locale: 'ko', department: { department: '영업팀' }, expected: '영업팀' },
    { locale: 'en', department: { department: '영업팀' }, expected: '영업팀' },
    { locale: 'ko', department: { departmentName: '물류팀' }, expected: '물류팀' },
    { locale: 'en', department: { departmentName: '물류팀' }, expected: '물류팀' },
  ])(
    '$locale 에서 서버 부서를 그대로 표시한다: $department',
    async ({ locale, department, expected }) => {
      server.use(http.get(PROFILE_ENDPOINTS.PROFILE_INFO, () => ok({ ...profile, ...department })));
      renderWithProviders(<PurchaseRequestFormModal id="m" onClose={vi.fn()} />, {
        locale: locale === 'en' ? 'en' : 'ko',
      });
      expect(await screen.findByDisplayValue(expected)).toBeDisabled();
      expect(screen.queryByDisplayValue('생산팀')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('Production')).not.toBeInTheDocument();
    },
  );

  it('다른 부서 사용자는 품목만 보내고 요청자는 서버 인증에 맡긴다', async () => {
    let body: unknown;
    server.use(
      http.get(PROFILE_ENDPOINTS.PROFILE_INFO, () => ok({ ...profile, department: '영업팀' })),
      http.post(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS, async ({ request }) => {
        body = await request.json();
        return ok(null);
      }),
    );
    const onClose = vi.fn();
    renderWithProviders(<PurchaseRequestFormModal id="m" onClose={onClose} />);
    const user = await fillRequest();
    await user.click(screen.getByRole('button', { name: '구매 요청 제출' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(body).toEqual({
      items: [
        {
          itemName: '영업용 소모품',
          quantity: 2,
          uomName: 'EA',
          expectedUnitPrice: 5000,
          preferredSupplierName: '거래처',
          dueDate: toISOString(toDateKey(new Date())),
          purpose: '고객 상담',
          note: '',
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain('생산팀');
  });

  it.each([undefined, null, '   ', 42])(
    '부서가 %s 이면 안내하고 제출을 차단한다',
    async (department) => {
      const post = vi.fn(() => ok(null));
      server.use(
        http.get(PROFILE_ENDPOINTS.PROFILE_INFO, () => ok({ ...profile, department })),
        http.post(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS, post),
      );
      renderWithProviders(<PurchaseRequestFormModal id="m" onClose={vi.fn()} />);
      expect(
        await screen.findByText('로그인 사용자의 부서가 없어 구매 요청을 제출할 수 없습니다.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '구매 요청 제출' })).toBeDisabled();
      await fillRequest();
      submitForm();
      expect(post).not.toHaveBeenCalled();
      expect(screen.getByPlaceholderText('품목명 입력')).toHaveValue('영업용 소모품');
    },
  );

  it('부서를 조회하는 동안에는 유효한 폼도 전송하지 않는다', async () => {
    let finish = () => {};
    const response = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const post = vi.fn(() => ok(null));
    server.use(
      http.get(PROFILE_ENDPOINTS.PROFILE_INFO, async () => {
        await response;
        return ok({ ...profile, department: '영업팀' });
      }),
      http.post(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS, post),
    );
    renderWithProviders(<PurchaseRequestFormModal id="m" onClose={vi.fn()} />);
    try {
      expect(screen.getByRole('button', { name: '구매 요청 제출' })).toBeDisabled();
      await fillRequest();
      submitForm();
      expect(post).not.toHaveBeenCalled();
    } finally {
      finish();
    }
    expect(await screen.findByDisplayValue('영업팀')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('품목명 입력')).toHaveValue('영업용 소모품');
  });

  it('부서 조회 실패를 알리고 입력을 보존한 채 재시도한다', async () => {
    let attempts = 0;
    const post = vi.fn(() => ok(null));
    server.use(
      http.get(PROFILE_ENDPOINTS.PROFILE_INFO, () => {
        attempts += 1;
        return attempts === 1
          ? new HttpResponse(null, { status: 500 })
          : ok({ ...profile, department: '영업팀' });
      }),
      http.post(PURCHASE_ENDPOINTS.PURCHASE_REQUESTS, post),
    );
    renderWithProviders(<PurchaseRequestFormModal id="m" onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('요청 부서를 불러오지 못했습니다.');
    const user = await fillRequest();
    expect(screen.getByRole('button', { name: '구매 요청 제출' })).toBeDisabled();
    submitForm();
    expect(post).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByDisplayValue('영업팀')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('품목명 입력')).toHaveValue('영업용 소모품');
    await user.click(screen.getByRole('button', { name: '구매 요청 제출' }));
    await waitFor(() => expect(post).toHaveBeenCalledOnce());
  });
});
