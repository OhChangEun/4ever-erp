import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { postPayrollComplete } from '@/app/(private)/hrm/api/hrm.api';
import PayrollManagement from '../tabs/mainTab/PayrollManagement';

/**
 * 이미 처리된 건의 버튼 카드. 급여 상세의 "지급완료 처리"는 모달을 열 때 받은 목록 값이 아니라
 * 상세 쿼리의 상태를 본다. 목록을 받은 뒤 다른 곳에서 지급 처리가 끝난 경우.
 */
describe('급여 상세: 지급완료 버튼은 상세 상태를 본다', () => {
  it('목록은 미지급이어도 상세가 지급완료면 버튼이 없다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PayrollManagement />);
    const row = within(await screen.findByRole('row', { name: /홍길동/ }, { timeout: 3000 }));
    expect(row.getByText('미지급')).toBeInTheDocument();

    await postPayrollComplete({ payrollId: 'pay-001' });

    await user.click(row.getByRole('button', { name: '상세보기' }));
    const detail = within(await screen.findByRole('dialog', { name: '급여 상세정보' }));
    expect(await detail.findByText('지급완료')).toBeInTheDocument();
    expect(detail.queryByRole('button', { name: '지급완료 처리' })).not.toBeInTheDocument();
  });
});
