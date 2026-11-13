'use client';

import { type FormEvent, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  type AttendanceRecordsResponse,
  type RequestVacation,
  type TodayAttendResponse,
} from '../ProfileType';
import { useQuery } from '@tanstack/react-query';
import { getAttendaceRecords, getTodayAttendance } from '../profile.api';
import { useCheckIn, useCheckOut, useRequestVacation } from '../profile.mutations';
import { useToast } from '@/app/components/common/toast/useToast';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { profileKeys } from '../profile.keys';
import StatusLabel from '@/app/components/common/StatusLabel';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Button } from '@everp/ui';

export default function AttendanceRecord() {
  const t = useTranslations('myProfile');
  const tCommon = useTranslations('common');
  const dateLocale = useLocale() === 'ko' ? 'ko-KR' : 'en-US';
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState<RequestVacation>({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
  });

  const handleCheckInOut = () => {
    if (!todayAttendanceRes || isCheckedOut) return;
    // 상태는 서버 응답에서 바로 읽는다. 출퇴근 훅은 재조회가 끝날 때까지 pending 이라 두 번 눌리지 않는다
    if (isBeforeCheckIn) {
      checkIn();
    } else {
      checkOut();
    }
  };

  const handleLeaveFormChange = (key: keyof typeof leaveForm, value: string) => {
    setLeaveForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 무효화(내 근태 + 인사 근태, 휴가 목록)는 profile.mutations.ts 한 곳.
  const { mutate: sendVacation, isPending: isRequestingVacation } = useRequestVacation({
    onSuccess: () => {
      toast.success(t('leave.success'));
      setIsLeaveModalOpen(false);
      setLeaveForm({ leaveType: 'ANNUAL', startDate: '', endDate: '' });
    },
    onError: (error) => toast.error(t('leave.error', { message: errorMessageOf(error) })),
  });
  const { mutate: checkIn, isPending: isCheckingIn } = useCheckIn({
    onSuccess: () => {
      toast.success(t('attendance.checkInSuccess'));
    },
    onError: (error) =>
      toast.error(t('attendance.checkInError', { message: errorMessageOf(error) })),
  });
  const { mutate: checkOut, isPending: isCheckingOut } = useCheckOut({
    onSuccess: () => {
      toast.success(t('attendance.checkOutSuccess'));
    },
    onError: (error) =>
      toast.error(t('attendance.checkOutError', { message: errorMessageOf(error) })),
  });

  const handleLeaveSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRequestingVacation) return;
    sendVacation(leaveForm);
  };

  const {
    data: todayAttendanceRes,
    isError: isTodayError,
    error: todayError,
  } = useQuery<TodayAttendResponse>({
    queryKey: profileKeys.todayAttendance(),
    queryFn: getTodayAttendance,
  });

  const {
    data: AttendanceRecordsRes,
    isError: isRecordsError,
    error: recordsError,
  } = useQuery<AttendanceRecordsResponse[]>({
    queryKey: profileKeys.attendanceRecords(),
    queryFn: getAttendaceRecords,
  });

  // 프로필 게이트웨이는 응답을 그대로 전달한다. 상태 코드 대신 시간 기록으로 동작을 정한다.
  const isCheckedOut = Boolean(
    (todayAttendanceRes?.checkOutTime && todayAttendanceRes.checkOutTime !== '-') ||
    todayAttendanceRes?.status === '퇴근완료',
  );
  const isBeforeCheckIn =
    !isCheckedOut && (!todayAttendanceRes?.checkInTime || todayAttendanceRes.checkInTime === '-');

  return (
    <>
      <section>
        <div className="pb-4 border-b border-gray-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('attendance.title')}</h2>
              <p className="text-sm text-gray-500">{t('attendance.subtitle')}</p>
            </div>
            {/* 이 칸의 주 동작은 출퇴근(primary). 휴가 신청은 보조 */}
            <Button
              variant="secondary"
              label={t('leave.request')}
              onClick={() => setIsLeaveModalOpen(true)}
            />
          </div>
        </div>

        <div className="pt-6">
          {/* 오늘 근태 현황 */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">{t('attendance.today')}</h3>
              <span className="text-xs text-gray-500">
                {new Date().toLocaleDateString(dateLocale)}
              </span>
            </div>

            {isTodayError ? (
              <TableStatusBox
                type="error"
                message={t('attendance.todayError')}
                error={todayError}
              />
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">{t('attendance.checkInTime')}</span>
                    <p className="text-sm font-medium text-gray-900">
                      {todayAttendanceRes?.checkInTime || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{t('attendance.checkOutTime')}</span>
                    <p className="text-sm font-medium text-gray-900">
                      {todayAttendanceRes?.checkOutTime || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{t('attendance.workHours')}</span>
                    <p className="text-sm font-medium text-gray-900">
                      {todayAttendanceRes?.workHours || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{t('attendance.status')}</span>
                    <StatusLabel statusCode={todayAttendanceRes?.status} />
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCheckInOut}
                  disabled={!todayAttendanceRes || isCheckedOut || isCheckingIn || isCheckingOut}
                  label={
                    isCheckedOut
                      ? t('attendance.checkedOut')
                      : isBeforeCheckIn
                        ? t('attendance.checkIn')
                        : t('attendance.checkOut')
                  }
                />
              </>
            )}
          </div>

          {/* 최근 근태 기록 */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-900">{t('attendance.recent')}</h3>
            <div className="divide-y divide-gray-200">
              {isRecordsError ? (
                <TableStatusBox
                  type="error"
                  message={t('attendance.recentError')}
                  error={recordsError}
                />
              ) : AttendanceRecordsRes && AttendanceRecordsRes.length > 0 ? (
                AttendanceRecordsRes.map((record, index) => (
                  <div key={index} className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">{record.date}</span>
                      <StatusLabel statusCode={record.status} />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {record.startTime} - {record.endTime}
                      </p>
                      <p className="text-xs text-gray-700">{record.workHours}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">{t('attendance.empty')}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('leave.request')}</h3>
                <p className="text-sm text-gray-500">{t('leave.hint')}</p>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
                aria-label={tCommon('close')}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-4 px-6 py-6">
              <div>
                <label
                  htmlFor="leave-type"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  {t('leave.type')}
                </label>
                <select
                  id="leave-type"
                  value={leaveForm.leaveType}
                  onChange={(event) => handleLeaveFormChange('leaveType', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="ANNUAL">{t('leave.ANNUAL')}</option>
                  <option value="SICK">{t('leave.SICK')}</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="leave-start"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    {t('leave.startDate')}
                  </label>
                  <input
                    id="leave-start"
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(event) => handleLeaveFormChange('startDate', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="leave-end"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    {t('leave.endDate')}
                  </label>
                  <input
                    id="leave-end"
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(event) => handleLeaveFormChange('endDate', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 sm:w-auto"
                >
                  {t('leave.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isRequestingVacation}
                  className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 sm:w-auto"
                >
                  {t('leave.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
