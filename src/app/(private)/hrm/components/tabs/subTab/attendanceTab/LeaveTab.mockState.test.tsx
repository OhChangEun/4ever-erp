import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { mockApi } from '@/test/mockApi';
import * as z from 'zod';
import LeaveTab from './LeaveTab';

/** 목이 쓰기 결과를 따르게 카드. 기본 목(덮어쓰기 없음)으로 본다 */
describe('휴가 목록: 목이 쓰기 결과를 따른다', () => {
  it('승인하면 그 행의 승인과 반려 버튼 자리에 승인 상태가 보인다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeaveTab />);

    // 대기 휴가 leave-001(홍길동). 홍길동의 지난 승인 휴가 행도 있어 시작일로 좁힌다. 날짜는 오늘 기준이라 목에서 꺼낸다
    // (카드 "데모 목록 인사 재무")
    const startDate = z
      .object({
        data: z.object({
          content: z.array(z.object({ leaveRequestId: z.string(), startDate: z.string() })),
        }),
      })
      .parse(await mockApi('GET', '/business/hrm/leave-request?page=0&size=1000'))
      .data.content.find((leave) => leave.leaveRequestId === 'leave-001')?.startDate;
    const name = new RegExp(`홍길동.*${startDate}`);
    const row = () => screen.findByRole('row', { name }, { timeout: 3000 });
    await user.click(within(await row()).getByRole('button', { name: '승인' }));
    const dialog = within(
      await screen.findByRole('dialog', { name: '해당 요청을 승인하시겠습니까?' }),
    );
    await user.click(dialog.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await waitFor(async () => {
      const after = within(await row());
      expect(after.queryByRole('button', { name: '승인' })).not.toBeInTheDocument();
      expect(after.queryByRole('button', { name: '반려' })).not.toBeInTheDocument();
      expect(after.getByText('승인')).toBeInTheDocument();
    });
  });
});
