import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { createTestQueryClient } from '@/test/render';
import { PROFILE_ENDPOINTS } from '@/app/types/api';
import { ToastProvider } from '@/app/components/common/toast/ToastProvider';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';
import profileKo from '@/i18n/messages/profile/ko.json';
import profileEn from '@/i18n/messages/profile/en.json';
import AttendanceRecord from './components/AttendanceRecord';
import TrainingStatus from './components/TrainingStatus';

function renderProfile(locale: 'ko' | 'en', training = false) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'ko' ? { ...ko, myProfile: profileKo } : { ...en, myProfile: profileEn }}
      timeZone="Asia/Seoul"
    >
      <QueryClientProvider client={createTestQueryClient()}>
        <ToastProvider>{training ? <TrainingStatus /> : <AttendanceRecord />}</ToastProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe('프로필 표시 결함', () => {
  it.each([
    { onTime: 'ON_TIME', late: 'LATE' },
    { onTime: '정상', late: '지각' },
  ])('최근 정상과 지각 기록의 점 색상을 구분한다: $onTime $late', async ({ onTime, late }) => {
    server.use(
      http.get(PROFILE_ENDPOINTS.ATTENDANCE_RECORDS, () =>
        HttpResponse.json({
          data: [
            {
              date: '2026-11-09',
              status: onTime,
              startTime: '09:00',
              endTime: '18:00',
              workHours: '8',
            },
            {
              date: '2026-11-08',
              status: late,
              startTime: '10:00',
              endTime: '18:00',
              workHours: '7',
            },
          ],
        }),
      ),
    );
    renderProfile('ko');
    const onTimeRow = (await screen.findByText('2026-11-09')).parentElement;
    const lateRow = (await screen.findByText('2026-11-08')).parentElement;
    expect(onTimeRow?.querySelector('[aria-hidden="true"]')).toHaveClass('bg-green-500');
    expect(lateRow?.querySelector('[aria-hidden="true"]')).toHaveClass('bg-orange-500');
  });

  it.each(['ON_TIME', 'NORMAL', '출근전'])(
    '출근 기록이 없으면 출근 요청을 보낸다: %s',
    async (status) => {
      const checkIn = vi.fn();
      server.use(
        http.get(PROFILE_ENDPOINTS.TODAY_ATTENDANCE, () =>
          HttpResponse.json({ data: { status, checkInTime: '', checkOutTime: '', workHours: '' } }),
        ),
        http.patch(PROFILE_ENDPOINTS.CHECK_IN, () => {
          checkIn();
          return HttpResponse.json({ success: true });
        }),
      );
      renderProfile('ko');
      await userEvent.click(await screen.findByRole('button', { name: '출근하기' }));
      expect(checkIn).toHaveBeenCalledOnce();
    },
  );

  it.each(['ON_TIME', 'NORMAL', '정상'])('출근 후에는 퇴근 요청을 보낸다: %s', async (status) => {
    const checkOut = vi.fn();
    server.use(
      http.get(PROFILE_ENDPOINTS.TODAY_ATTENDANCE, () =>
        HttpResponse.json({
          data: { status, checkInTime: '09:00', checkOutTime: '', workHours: '' },
        }),
      ),
      http.patch(PROFILE_ENDPOINTS.CHECK_OUT, () => {
        checkOut();
        return HttpResponse.json({ success: true });
      }),
    );
    renderProfile('ko');
    await userEvent.click(await screen.findByRole('button', { name: '퇴근하기' }));
    expect(checkOut).toHaveBeenCalledOnce();
  });

  it.each(['ON_TIME', '정상', '퇴근완료'])(
    '퇴근 시간이 있으면 완료 버튼을 비활성화한다: %s',
    async (status) => {
      server.use(
        http.get(PROFILE_ENDPOINTS.TODAY_ATTENDANCE, () =>
          HttpResponse.json({
            data: { status, checkInTime: '09:00', checkOutTime: '18:00', workHours: '8' },
          }),
        ),
      );
      renderProfile('ko');
      expect(await screen.findByRole('button', { name: '퇴근완료' })).toBeDisabled();
    },
  );

  it.each([
    { locale: 'ko', normal: '정상', late: '지각' },
    { locale: 'en', normal: 'On time', late: 'Late' },
  ] satisfies { locale: 'ko' | 'en'; normal: string; late: string }[])(
    '오늘과 최근 상태를 번역한다: $locale',
    async ({ locale, normal, late }) => {
      server.use(
        http.get(PROFILE_ENDPOINTS.ATTENDANCE_RECORDS, () =>
          HttpResponse.json({
            data: [
              {
                date: '2026-11-09',
                status: 'LATE',
                startTime: '10:00',
                endTime: '18:00',
                workHours: '7',
              },
            ],
          }),
        ),
      );
      renderProfile(locale);
      expect(await screen.findByText(normal)).toBeInTheDocument();
      expect(await screen.findByText(late)).toBeInTheDocument();
      expect(screen.queryByText('ON_TIME')).not.toBeInTheDocument();
    },
  );

  it.each([
    { locale: 'ko', category: 'SAFETY', label: '안전' },
    { locale: 'en', category: 'SAFETY', label: 'Safety' },
    { locale: 'ko', category: 'BASIC_TRAINING', label: '기본 교육' },
    { locale: 'en', category: 'BASIC_TRAINING', label: 'Basic training' },
  ] satisfies { locale: 'ko' | 'en'; category: string; label: string }[])(
    '교육 분류를 번역한다: $locale $category',
    async ({ locale, category, label }) => {
      server.use(
        http.get(PROFILE_ENDPOINTS.PROGRESS_TRAINING, () =>
          HttpResponse.json({
            data: [
              {
                trainingId: 'test',
                trainingName: 'Test',
                category,
                durationHours: 3,
                trainingStatus: 'IN_PROGRESS',
              },
            ],
          }),
        ),
      );
      renderProfile(locale, true);
      expect(await screen.findByText(label, { exact: false })).toBeInTheDocument();
    },
  );
});
