import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import PayrollManagement from './PayrollManagement';

const DETAIL_TITLE = '급여 상세정보';

/**
 * 목이 쓰기 결과를 따르게 카드. 기본 목(덮어쓰기 없음)으로 본다.
 * 예전 목은 급여 상태를 PENDING 으로 줘서 "지급완료 처리" 버튼(PAYROLL_UNPAID 일 때만)이 아예 안 떴다.
 */
describe('급여 관리: 목 상태가 서버 값이고 쓰기 결과를 따른다', () => {
  it('미지급 급여에 지급완료 버튼이 보이고, 처리 뒤 행이 지급완료이며 다시 연 상세에 버튼이 없다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PayrollManagement />);

    const row = () => screen.findByRole('row', { name: /홍길동/ }, { timeout: 3000 });
    expect(within(await row()).getByText('미지급')).toBeInTheDocument();

    await user.click(within(await row()).getByRole('button', { name: '상세보기' }));
    const detail = within(await screen.findByRole('dialog', { name: DETAIL_TITLE }));
    await user.click(await detail.findByRole('button', { name: '지급완료 처리' }));
    const confirm = within(
      await screen.findByRole('dialog', { name: '해당 급여를 지급 완료 처리하시겠습니까?' }),
    );
    await user.click(confirm.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(0));

    await waitFor(async () =>
      expect(within(await row()).getByText('지급완료')).toBeInTheDocument(),
    );

    await user.click(within(await row()).getByRole('button', { name: '상세보기' }));
    const reopened = within(await screen.findByRole('dialog', { name: DETAIL_TITLE }));
    // 상세가 다 뜬 뒤(상태 글자가 보인 뒤)에 버튼이 없는지 본다
    expect(await reopened.findByText('지급완료')).toBeInTheDocument();
    expect(reopened.queryByRole('button', { name: '지급완료 처리' })).not.toBeInTheDocument();
  });
});
