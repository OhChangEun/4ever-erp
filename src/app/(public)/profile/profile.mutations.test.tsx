import { describe, it } from 'vitest';
import { expectMatrix } from '@/test/mutationMatrix';
import { profileKeys } from './profile.keys';
import { attendanceKeys, leaveKeys, trainingKeys } from '@/app/(private)/hrm/api/hrm.keys';
import {
  useCheckIn,
  useCheckOut,
  useRegisterTraining,
  useRequestVacation,
} from './profile.mutations';

const FOREIGN = ['purchase', 'orders', 'list'];
const LEAVE_LIST = leaveKeys.list({ page: 0, size: 10 });
const ATTENDANCE_LIST = attendanceKeys.list({ page: 0, size: 10, date: '2026-11-09' });
const TRAINING_LIST = trainingKeys.list({ page: 0, size: 10 });

describe('프로필 셀프서비스 mutation 훅', () => {
  it('휴가 신청 → 내 근태 기록 + 인사 휴가 목록(교차)', () =>
    expectMatrix({
      name: '',
      useHook: useRequestVacation,
      variables: { leaveType: 'ANNUAL', startDate: '2026-11-10', endDate: '2026-11-11' },
      invalidates: [profileKeys.attendanceRecords(), LEAVE_LIST],
      keeps: [profileKeys.info(), TRAINING_LIST, FOREIGN],
    }));

  it('출근 → 오늘 근태, 근태 기록 + 인사 근태 목록(교차)', () =>
    expectMatrix({
      name: '',
      useHook: useCheckIn,
      variables: undefined,
      invalidates: [
        profileKeys.todayAttendance(),
        profileKeys.attendanceRecords(),
        ATTENDANCE_LIST,
      ],
      keeps: [profileKeys.info(), LEAVE_LIST, FOREIGN],
    }));

  it('퇴근 → 오늘 근태, 근태 기록 + 인사 근태 목록(교차)', () =>
    expectMatrix({
      name: '',
      useHook: useCheckOut,
      variables: undefined,
      invalidates: [
        profileKeys.todayAttendance(),
        profileKeys.attendanceRecords(),
        ATTENDANCE_LIST,
      ],
      keeps: [profileKeys.info(), LEAVE_LIST, FOREIGN],
    }));

  it('교육 신청 → 내 교육 탭 전부 + 인사 교육 이력(교차)', () =>
    expectMatrix({
      name: '',
      useHook: useRegisterTraining,
      variables: 'tr-1',
      invalidates: [
        profileKeys.training('available'),
        profileKeys.training('progress'),
        TRAINING_LIST,
      ],
      keeps: [profileKeys.info(), FOREIGN],
    }));
});
