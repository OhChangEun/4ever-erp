'use client';

import { useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { type AttendanceRecordsResponse, type TodayAttendResponse } from '../ProfileType';
import { useQuery } from '@tanstack/react-query';
import { getAttendaceRecords, getTodayAttendance } from '../profile.api';
import { useCheckIn, useCheckOut, useRequestVacation } from '../profile.mutations';
import { useToast } from '@/app/components/common/toast/useToast';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { profileKeys } from '../profile.keys';
import StatusLabel from '@/app/components/common/StatusLabel';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { Button } from '@everp/ui';
import { useModal } from '@/app/components/common/modal/useModal';
import LeaveRequestModal, { EMPTY_LEAVE } from './LeaveRequestModal';

export default function AttendanceRecord() {
  const t = useTranslations('myProfile');
  const dateLocale = useLocale() === 'ko' ? 'ko-KR' : 'en-US';
  const errorMessageOf = useErrorMessage();
  const toast = useToast();
  const { openModal, closeModal } = useModal();
  // 신청 창을 닫았다 열어도 쓰던 값이 남게 여기서 든다. 화면에 그리지 않아 ref 다
  const leaveDraft = useRef(EMPTY_LEAVE);
  const leaveModalIds = useRef<string[]>([]);

  // 무효화는 PROFILE_MUTATION_EFFECTS(profile.mutations.ts) 한 곳. 훅이 여기 있어 창을 닫고 다시 열어도 같은 요청을 안다
  const { mutate: sendVacation } = useRequestVacation({
    onSuccess: (_data, submitted) => {
      toast.success(t('leave.success'));
      // 보낸 값 그대로면 닫고 비운다(또 보내지 않게). 그 사이 고쳤으면 다음 신청이라 남긴다
      if (leaveDraft.current !== submitted) return;
      leaveDraft.current = EMPTY_LEAVE;
      leaveModalIds.current.forEach(closeModal);
    },
    onError: (error) => toast.error(t('leave.error', { message: errorMessageOf(error) })),
  });

  const handleLeaveRequest = () => {
    const id = openModal(LeaveRequestModal, {
      title: t('leave.request'),
      width: '448px',
      initialForm: leaveDraft.current,
      onFormChange: (form) => {
        leaveDraft.current = form;
      },
      onSubmit: sendVacation,
    });
    leaveModalIds.current.push(id);
  };

  const handleCheckInOut = () => {
    if (!todayAttendanceRes || isCheckedOut) return;
    // 상태는 서버 응답에서 바로 읽는다. 출퇴근 훅은 재조회가 끝날 때까지 pending 이라 두 번 눌리지 않는다
    if (isBeforeCheckIn) {
      checkIn();
    } else {
      checkOut();
    }
  };

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
            <Button variant="secondary" label={t('leave.request')} onClick={handleLeaveRequest} />
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
                    {/* 다른 칸처럼 값은 이름 아래 줄. StatusLabel 은 inline 이라 블록으로 감싼다 */}
                    <p>
                      <StatusLabel statusCode={todayAttendanceRes?.status} />
                    </p>
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
    </>
  );
}
