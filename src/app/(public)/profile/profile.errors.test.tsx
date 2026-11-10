import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { PROFILE_ENDPOINTS } from '@/app/types/api';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/msw-server';
import type { Locale } from '@/i18n/locale';
import AttendanceRecord from './components/AttendanceRecord';

const beforeCheckIn = () =>
  server.use(
    http.get(PROFILE_ENDPOINTS.TODAY_ATTENDANCE, () =>
      HttpResponse.json({
        status: 200,
        success: true,
        message: 'OK',
        data: { checkInTime: '-', checkOutTime: '-', workHours: '-', status: 'BEFORE_WORK' },
      }),
    ),
  );

describe('프로필 변경 실패 토스트의 언어', () => {
  it.each<[Locale, string, string]>([
    [
      'en',
      'Check in',
      "Couldn't check in. Cannot connect to the server. Please check your network.",
    ],
    [
      'ko',
      '출근하기',
      '출근 처리 중 오류가 발생했습니다. 서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.',
    ],
  ])('%s 화면은 연결 실패를 같은 언어로 알린다', async (locale, button, message) => {
    beforeCheckIn();
    server.use(http.patch(PROFILE_ENDPOINTS.CHECK_IN, () => HttpResponse.error()));
    const user = userEvent.setup();
    renderWithProviders(<AttendanceRecord />, { locale });

    const checkIn = await screen.findByRole('button', { name: button });
    await user.click(checkIn);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: button })).toBeEnabled();
  });

  it.each<[Locale, string, string]>([
    [
      'en',
      'Check in',
      "Couldn't check in. Another user has already made changes. Please reload the data.",
    ],
    [
      'ko',
      '출근하기',
      '출근 처리 중 오류가 발생했습니다. 다른 사용자가 먼저 수정했습니다. 다시 불러와 주세요.',
    ],
  ])('%s 토스트는 서버 메시지 없이 종류별 문구만 보인다', async (locale, button, message) => {
    beforeCheckIn();
    const serverMessage = '이미 출근 처리되었습니다. [ATTENDANCE_409]';
    server.use(
      http.patch(PROFILE_ENDPOINTS.CHECK_IN, () =>
        HttpResponse.json({ status: 409, success: false, message: serverMessage }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<AttendanceRecord />, { locale });

    await user.click(await screen.findByRole('button', { name: button }));

    expect(await screen.findByText(message, { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('status')).not.toHaveTextContent(serverMessage);
  });
});
