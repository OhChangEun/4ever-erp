import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { ok } from '@/mocks/utils';
import { scenarioResponse } from '@/mocks/scenario';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import PayrollManagement from '@/app/(private)/hrm/components/tabs/mainTab/PayrollManagement';
import { todayKey } from '@/mocks/handlers/seed';

const DETAIL_TITLE = '급여 상세정보';
const CONFIRM_TITLE = '해당 급여를 지급 완료 처리하시겠습니까?';

/**
 * 이번 달 emp-001 급여 id. 상세는 기본 목이 주고 기본 목은 이 id 만 안다(pay-<연월>-<직원 순번>,
 * 카드 "데모 목록 인사 재무". 예전 한 줄 목록은 pay-001)
 */
const PAY = `pay-${todayKey().slice(0, 7).replace('-', '')}-001`;

/** 미지급 급여 한 건. 지급완료 버튼은 이 상태에서만 보인다 */
const unpaidList = () =>
  ok({
    content: [
      {
        payrollId: PAY,
        employee: {
          employeeId: 'emp-001',
          employeeName: '홍길동',
          departmentId: 'dept-001',
          department: '영업팀',
          positionId: 'pos-001',
          position: '팀장',
        },
        pay: {
          basePay: 3000000,
          overtimePay: 200000,
          deduction: 150000,
          netPay: 3050000,
          statusCode: 'PAYROLL_UNPAID',
        },
      },
    ],
    page: { number: 0, size: 10, totalElements: 1, totalPages: 1, hasNext: false },
  });

describe('급여 지급 완료 확인 창(실제 모달 스택)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** 급여 목록의 행 버튼으로 급여 상세 모달을 열고, 그 위에 확인 모달을 띄운다 */
  const openConfirm = async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    server.use(http.get(HRM_ENDPOINTS.PAYROLL, unpaidList));
    const user = userEvent.setup();
    renderWithProviders(<PayrollManagement />);
    const rowButton = await screen.findByRole('button', { name: '상세보기' }, { timeout: 3000 });
    await user.click(rowButton);
    const detail = within(await screen.findByRole('dialog', { name: DETAIL_TITLE }));
    await user.click(await detail.findByRole('button', { name: '지급완료 처리' }));
    expect(nativeConfirm).not.toHaveBeenCalled();
    const confirm = within(await screen.findByRole('dialog', { name: CONFIRM_TITLE }));
    expect(confirm.queryByRole('textbox')).not.toBeInTheDocument();
    return { user, rowButton, confirm };
  };

  it('급여 모달 위에 겹쳐 뜬 확인 창의 처음 포커스는 닫기(X)가 아니라 취소 버튼이다', async () => {
    const { confirm } = await openConfirm();
    await waitFor(() => expect(confirm.getByRole('button', { name: '취소' })).toHaveFocus());
    expect(confirm.getByRole('button', { name: '닫기' })).not.toHaveFocus();
  });

  it('성공하면 요청이 한 번 나가고 확인 창과 급여 모달이 둘 다 닫히고 포커스가 목록의 행 버튼으로 돌아온다', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(HRM_ENDPOINTS.PAYROLL_COMPLETE, async ({ request }) => {
        bodies.push(await request.json());
        return ok(null);
      }),
    );
    const { user, rowButton, confirm } = await openConfirm();
    await user.click(confirm.getByRole('button', { name: '확인' }));

    await waitFor(() => expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(0));
    expect(bodies).toEqual([{ payrollId: PAY }]);
    // 확인 창이 포커스를 돌려줄 "지급완료 처리" 버튼은 급여 모달과 함께 사라진다. body 로 떨어지면 안 된다
    await waitFor(() => expect(rowButton).toHaveFocus());
  });

  it('실패하면 확인 창과 급여 모달이 둘 다 남고 오류가 보이고, 다시 눌러 성공하면 둘 다 닫힌다', async () => {
    let calls = 0;
    server.use(
      http.post(HRM_ENDPOINTS.PAYROLL_COMPLETE, () => {
        calls += 1;
        return calls === 1 ? scenarioResponse('500') : ok(null);
      }),
    );
    const { user, confirm } = await openConfirm();
    await user.click(confirm.getByRole('button', { name: '확인' }));

    expect(await screen.findByText(/급여 지급 처리에 실패했습니다/)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: CONFIRM_TITLE })).toBeInTheDocument();
    // 아래 급여 모달은 확인 창에 가려 접근성 트리에서 숨어 있다
    expect(screen.getByRole('dialog', { name: DETAIL_TITLE, hidden: true })).toBeInTheDocument();
    await waitFor(() => expect(confirm.getByRole('button', { name: '확인' })).toBeEnabled());

    await user.click(confirm.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(0));
    expect(calls).toBe(2);
  });
});
