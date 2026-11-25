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
  // 모달 틀은 dynamic import 라 조금 뒤에 뜬다
  await screen.findByRole('dialog', { name: '휴가 신청' });
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
    expect(await screen.findByLabelText('휴가 유형')).toHaveValue('ANNUAL');
    expect(screen.getByLabelText('시작일')).toHaveValue('');
    expect(screen.getByLabelText('종료일')).toHaveValue('');
  });

  it('Esc 로 닫으면 연 버튼으로 포커스가 돌아가고, 다시 열면 쓰던 값이 남아 있다', async () => {
    renderWithProviders(<AttendanceRecord />);
    const user = await fillVacation();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const trigger = screen.getByRole('button', { name: '휴가 신청' });
    await waitFor(() => expect(trigger).toHaveFocus());
    await user.click(trigger);
    expect(await screen.findByLabelText('휴가 유형')).toHaveValue('SICK');
    expect(screen.getByLabelText('시작일')).toHaveValue('2026-11-12');
  });

  it('신청 중에 닫고 다시 열어도 두 번 보내지 않는다', async () => {
    let finish = () => {};
    const response = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let requests = 0;
    server.use(
      http.post(PROFILE_ENDPOINTS.VACATION, async () => {
        requests += 1;
        await response;
        return HttpResponse.json({ success: true });
      }),
    );
    renderWithProviders(<AttendanceRecord />);
    const user = await fillVacation();
    await user.click(screen.getByRole('button', { name: '신청하기' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '휴가 신청' }));
    expect(await screen.findByRole('button', { name: '신청하기' })).toBeDisabled();
    finish();
    expect(await screen.findByText('휴가 신청이 접수되었습니다.')).toBeInTheDocument();
    expect(requests).toBe(1);
  });

  const holdVacation = (status: 200 | 500) => {
    let finish = () => {};
    const response = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let requests = 0;
    server.use(
      http.post(PROFILE_ENDPOINTS.VACATION, async () => {
        requests += 1;
        await response;
        return status === 200
          ? HttpResponse.json({ success: true })
          : new HttpResponse(null, { status });
      }),
    );
    return { finish: () => finish(), requests: () => requests };
  };
  /** 신청을 보내고 응답 전에 닫았다가 다시 연다 */
  const submitAndReopen = async () => {
    renderWithProviders(<AttendanceRecord />);
    const user = await fillVacation();
    await user.click(screen.getByRole('button', { name: '신청하기' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '휴가 신청' }));
    await screen.findByRole('dialog', { name: '휴가 신청' });
    return user;
  };

  it('보낸 값 그대로 다시 열어 두면 늦은 성공이 닫고 비운다(같은 휴가를 또 보내지 않게)', async () => {
    const { finish, requests } = holdVacation(200);
    const user = await submitAndReopen();
    expect(screen.getByLabelText('시작일')).toHaveValue('2026-11-12');
    expect(screen.getByRole('button', { name: '신청하기' })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '휴가 신청' }));
    expect(await screen.findByLabelText('시작일')).toHaveValue('');
    expect(requests()).toBe(1);
  });

  it('다시 열어 고친 값은 늦은 성공이 닫거나 지우지 않는다', async () => {
    const { finish } = holdVacation(200);
    const user = await submitAndReopen();
    await user.clear(screen.getByLabelText('시작일'));
    await user.type(screen.getByLabelText('시작일'), '2026-12-24');
    finish();
    expect(await screen.findByText('휴가 신청이 접수되었습니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('시작일')).toHaveValue('2026-12-24');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '휴가 신청' }));
    expect(await screen.findByLabelText('시작일')).toHaveValue('2026-12-24');
  });

  it('다시 열어 둔 채 실패하면 보낸 값이 그대로 남고 다시 보낼 수 있다', async () => {
    const { finish } = holdVacation(500);
    await submitAndReopen();
    finish();
    expect(await screen.findByText(/휴가 신청 중 오류가 발생했습니다/)).toBeInTheDocument();
    expect(screen.getByLabelText('시작일')).toHaveValue('2026-11-12');
    expect(screen.getByRole('button', { name: '신청하기' })).toBeEnabled();
  });

  it('요청 중에 닫았는데 실패하면 보낸 값이 다음에 열 때 돌아온다', async () => {
    let finish = () => {};
    const response = new Promise<void>((resolve) => {
      finish = resolve;
    });
    server.use(
      http.post(PROFILE_ENDPOINTS.VACATION, async () => {
        await response;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    renderWithProviders(<AttendanceRecord />);
    const user = await fillVacation();
    await user.click(screen.getByRole('button', { name: '신청하기' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    finish();
    expect(await screen.findByText(/휴가 신청 중 오류가 발생했습니다/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '휴가 신청' }));
    expect(await screen.findByLabelText('시작일')).toHaveValue('2026-11-12');
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
