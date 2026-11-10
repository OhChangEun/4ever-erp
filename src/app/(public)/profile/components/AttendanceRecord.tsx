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
import { errorMessageOf } from '@/lib/AppError';
import { profileKeys } from '../profile.keys';
import StatusLabel from '@/app/components/common/StatusLabel';

export default function AttendanceRecord() {
  const t = useTranslations('myProfile');
  const tCommon = useTranslations('common');
  const dateLocale = useLocale() === 'ko' ? 'ko-KR' : 'en-US';
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
    onSuccess: () => toast.success(t('leave.success')),
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
    setIsLeaveModalOpen(false);
    sendVacation(leaveForm);
    setLeaveForm({
      leaveType: 'ANNUAL',
      startDate: '',
      endDate: '',
    });
  };

  const { data: todayAttendanceRes } = useQuery<TodayAttendResponse>({
    queryKey: profileKeys.todayAttendance(),
    queryFn: getTodayAttendance,
  });

  const { data: AttendanceRecordsRes } = useQuery<AttendanceRecordsResponse[]>({
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
      <div className="card-base min-h-188">
        <div className="p-6 border-b border-gray-200 ">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              {/* <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-time-line text-purple-600 text-lg"></i>
              </div> */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('attendance.title')}</h2>
                <p className="text-sm text-gray-500">{t('attendance.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="inline-flex items-center justify-center space-x-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-purple-700"
            >
              <i className="ri-flight-takeoff-line"></i>
              <span>{t('leave.request')}</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* 오늘 근태 현황 */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4 ">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">{t('attendance.today')}</h3>
              <span className="text-xs text-gray-500">
                {new Date().toLocaleDateString(dateLocale)}
              </span>
            </div>

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

            <button
              onClick={handleCheckInOut}
              disabled={!todayAttendanceRes || isCheckedOut || isCheckingIn || isCheckingOut}
              className={`w-full whitespace-nowrap rounded-lg py-3 px-4 font-medium transition-colors duration-200
    ${
      isCheckedOut
        ? 'bg-gray-400 text-white cursor-not-allowed'
        : isBeforeCheckIn
          ? 'bg-green-600 text-white hover:bg-green-700'
          : 'bg-red-600 text-white hover:bg-red-700'
    }
  `}
            >
              {isCheckedOut
                ? t('attendance.checkedOut')
                : isBeforeCheckIn
                  ? t('attendance.checkIn')
                  : t('attendance.checkOut')}
            </button>
          </div>

          {/* 최근 근태 기록 */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-900">{t('attendance.recent')}</h3>
            <div className="space-y-2">
              {AttendanceRecordsRes && AttendanceRecordsRes.length > 0 ? (
                AttendanceRecordsRes.map((record, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
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
      </div>

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
