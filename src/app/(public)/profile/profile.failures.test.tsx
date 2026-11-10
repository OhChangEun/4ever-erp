import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { PROFILE_ENDPOINTS } from '@/app/types/api';
import AttendanceRecord from './components/AttendanceRecord';

async function fillVacation() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '휴가 신청' }));
  await user.selectOptions(screen.getByLabelText('휴가 유형'), 'SICK');
  await user.type(screen.getByLabelText('시작일'), '2026-11-12');
  await user.type(screen.getByLabelText('종료일'), '2026-11-13');
  return user;
}

describe('프로필 요청 실패', () => {
  it('휴가 신청 실패 시 입력과 모달을 보존하고 오류를 표시한다', async () => {
    server.use(
      http.post(PROFILE_ENDPOINTS.VACATION, () => new HttpResponse(null, { status: 500 })),
    );
    renderWithProviders(<AttendanceRecord />);
    const user = await fillVacation();
    await user.click(screen.getByRole('button', { name: '신청하기' }));
    expect(await screen.findByText(/휴가 신청 중 오류가 발생했습니다/)).toBeInTheDocument();
    expect(screen.getByLabelText('휴가 유형')).toHaveValue('SICK');
    expect(screen.getByLabelText('시작일')).toHaveValue('2026-11-12');
    expect(screen.getByLabelText('종료일')).toHaveValue('2026-11-13');
    expect(screen.getByRole('button', { name: '신청하기' })).toBeEnabled();
  });

  it('응답 대기 중 중복 제출을 막고 성공한 뒤 닫고 초기화한다', async () => {
    let finish = () => {};
    const response = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let requests = 0;
    server.use(
      http.post(PROFILE_ENDPOINTS.VACATION, async ({ request }) => {
        requests += 1;
        expect(await request.json()).toEqual({
          leaveType: 'SICK',
          startDate: '2026-11-12',
          endDate: '2026-11-13',
        });
        await response;
        return HttpResponse.json({ success: true });
      }),
    );
    renderWithProviders(<AttendanceRecord />);
    const user = await fillVacation();
    try {
      await user.click(screen.getByRole('button', { name: '신청하기' }));
      expect(screen.getByRole('button', { name: '신청하기' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: '신청하기' }));
      expect(requests).toBe(1);
    } finally {
      finish();
    }
    expect(await screen.findByText('휴가 신청이 접수되었습니다.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('시작일')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '휴가 신청' }));
    expect(screen.getByLabelText('휴가 유형')).toHaveValue('ANNUAL');
    expect(screen.getByLabelText('시작일')).toHaveValue('');
    expect(screen.getByLabelText('종료일')).toHaveValue('');
  });

  it.each([
    { endpoint: PROFILE_ENDPOINTS.TODAY_ATTENDANCE, message: '오늘 근태를 불러오지 못했습니다.' },
    {
      endpoint: PROFILE_ENDPOINTS.ATTENDANCE_RECORDS,
      message: '최근 근태 기록을 불러오지 못했습니다.',
    },
  ])('$message', async ({ endpoint, message }) => {
    server.use(http.get(endpoint, () => new HttpResponse(null, { status: 500 })));
    renderWithProviders(<AttendanceRecord />);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('alert')).toHaveTextContent('서버 오류가 발생했습니다.');
  });
});
